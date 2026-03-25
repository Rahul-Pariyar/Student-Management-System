from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.db.models import Q, Count
from django.core.paginator import Paginator
from django.utils import timezone
from accounts.models import StudentProfile, TeacherProfile
from .models import (
    AcademicYear, Department, Course, Subject, Class, 
    StudentEnrollment, TeacherSubjectAssignment, Assignment, AssignmentSubmission
)
from .forms import (
    AcademicYearForm, DepartmentForm, CourseForm, EnhancedCourseForm, SubjectForm, ClassForm,
    StudentEnrollmentForm, TeacherSubjectAssignmentForm, AssignmentForm, 
    AssignmentSubmissionForm, ClassFilterForm
)
from accounts.models import StudentProfile, TeacherProfile

def is_admin(user):
    return user.is_authenticated and user.user_type == 'admin'

def is_teacher_or_admin(user):
    return user.is_authenticated and user.user_type in ['admin', 'teacher']

@login_required
def department_list(request):
    departments = Department.objects.all().annotate(
        course_count=Count('course'),
        teacher_count=Count('course__subject__teachersubjectassignment__teacher', distinct=True)
    )
    
    context = {
        'departments': departments,
        'can_manage': request.user.user_type == 'admin'
    }
    return render(request, 'academic/department_list.html', context)

@login_required
def course_list(request):
    courses = Course.objects.select_related('department').annotate(
        subject_count=Count('subject'),
        student_count=Count('class__studentenrollment', filter=Q(class__studentenrollment__is_active=True), distinct=True)
    )
    
    # Calculate summary statistics
    total_courses = courses.count()
    total_students = sum(course.student_count for course in courses)
    total_subjects = sum(course.subject_count for course in courses)
    avg_students_per_course = round(total_students / total_courses, 1) if total_courses > 0 else 0
    
    context = {
        'courses': courses,
        'total_courses': total_courses,
        'total_students': total_students,
        'total_subjects': total_subjects,
        'avg_students_per_course': avg_students_per_course,
        'can_manage': request.user.user_type == 'admin'
    }
    return render(request, 'academic/course_list.html', context)

@login_required
def subject_list(request):
    subjects = Subject.objects.select_related('course', 'course__department')
    
    # Filter based on user type
    if request.user.user_type == 'teacher':
        # Show only subjects assigned to this teacher
        teacher_assignments = TeacherSubjectAssignment.objects.filter(
            teacher=request.user.teacher_profile
        )
        subjects = subjects.filter(
            id__in=teacher_assignments.values_list('subject_id', flat=True)
        )
    elif request.user.user_type == 'student':
        # Show only subjects for student's class
        try:
            enrollment = request.user.student_profile.get_current_enrollment()
            if enrollment:
                subjects = subjects.filter(
                    course=enrollment.class_enrolled.course,
                    year=enrollment.class_enrolled.year,
                    semester=enrollment.class_enrolled.semester
                )
            else:
                subjects = subjects.none()
        except (StudentProfile.DoesNotExist, AttributeError):
            subjects = Subject.objects.none()
    
    context = {
        'subjects': subjects,
        'can_manage': request.user.user_type == 'admin'
    }
    return render(request, 'academic/subject_list.html', context)

@login_required
def class_list(request):
    classes = Class.objects.select_related(
        'course', 'course__department', 'academic_year', 'class_teacher__user'
    ).annotate(
        student_count=Count('studentenrollment', filter=Q(studentenrollment__is_active=True))
    )
    
    # Apply filters
    filter_form = ClassFilterForm(request.GET)
    if filter_form.is_valid():
        if filter_form.cleaned_data['course']:
            classes = classes.filter(course=filter_form.cleaned_data['course'])
        if filter_form.cleaned_data['year']:
            classes = classes.filter(year=filter_form.cleaned_data['year'])
        if filter_form.cleaned_data['semester']:
            classes = classes.filter(semester=filter_form.cleaned_data['semester'])
        if filter_form.cleaned_data['academic_year']:
            classes = classes.filter(academic_year=filter_form.cleaned_data['academic_year'])
    
    # Filter based on user type
    if request.user.user_type == 'teacher':
        # Show only classes assigned to this teacher
        teacher_assignments = TeacherSubjectAssignment.objects.filter(
            teacher=request.user.teacher_profile
        )
        classes = classes.filter(
            id__in=teacher_assignments.values_list('class_assigned_id', flat=True)
        )
    elif request.user.user_type == 'student':
        # Show only student's class
        try:
            enrollment = request.user.student_profile.get_current_enrollment()
            if enrollment:
                classes = classes.filter(id=enrollment.class_enrolled.id)
            else:
                classes = Class.objects.none()
        except (StudentProfile.DoesNotExist, AttributeError):
            classes = Class.objects.none()
    
    context = {
        'classes': classes,
        'filter_form': filter_form,
        'can_manage': request.user.user_type == 'admin'
    }
    return render(request, 'academic/class_list.html', context)

@login_required
def enrollment_list(request):
    enrollments = StudentEnrollment.objects.select_related(
        'student__user', 'class_enrolled__course', 'class_enrolled__academic_year'
    )
    
    # Filter based on user type
    if request.user.user_type == 'teacher':
        # Show only enrollments for classes taught by this teacher
        teacher_assignments = TeacherSubjectAssignment.objects.filter(
            teacher=request.user.teacher_profile
        )
        enrollments = enrollments.filter(
            class_enrolled__id__in=teacher_assignments.values_list('class_assigned_id', flat=True)
        )
    elif request.user.user_type == 'student':
        # Show only student's own enrollment
        enrollments = enrollments.filter(student=request.user.student_profile)
    
    context = {
        'enrollments': enrollments,
        'can_manage': request.user.user_type == 'admin'
    }
    return render(request, 'academic/enrollment_list.html', context)

@login_required
@user_passes_test(is_teacher_or_admin)
def assignment_list(request):
    from django.utils import timezone
    from django.db.models import Q
    
    today = timezone.now()
    
    # Base queryset
    assignments = Assignment.objects.select_related(
        'subject', 'class_assigned', 'teacher__user'
    ).annotate(
        submission_count=Count('assignmentsubmission')
    )
    
    # Filter based on user type
    if request.user.user_type == 'teacher':
        assignments = assignments.filter(teacher=request.user.teacher_profile)
    
    # Apply filters from request
    subject_filter = request.GET.get('subject')
    type_filter = request.GET.get('assignment_type')
    status_filter = request.GET.get('status')
    
    if subject_filter:
        assignments = assignments.filter(subject_id=subject_filter)
    
    if type_filter:
        assignments = assignments.filter(assignment_type=type_filter)
    
    if status_filter:
        if status_filter == 'active':
            assignments = assignments.filter(is_active=True)
        elif status_filter == 'inactive':
            assignments = assignments.filter(is_active=False)
    
    # Order by due date
    assignments = assignments.order_by('-assigned_date', 'due_date')
    
    # Get subjects for filter dropdown
    if request.user.user_type == 'teacher':
        teacher_assignments = TeacherSubjectAssignment.objects.filter(teacher=request.user.teacher_profile)
        subjects = Subject.objects.filter(id__in=teacher_assignments.values_list('subject_id', flat=True))
    else:
        subjects = Subject.objects.all()
    
    # Calculate statistics
    active_count = assignments.filter(is_active=True).count()
    overdue_count = assignments.filter(due_date__lt=today, is_active=True).count()
    total_submissions = sum(assignment.submission_count for assignment in assignments)
    
    context = {
        'assignments': assignments,
        'subjects': subjects,
        'subject_filter': subject_filter,
        'type_filter': type_filter,
        'status_filter': status_filter,
        'active_count': active_count,
        'overdue_count': overdue_count,
        'total_submissions': total_submissions,
        'today': today,
        'can_create': request.user.user_type in ['admin', 'teacher']
    }
    return render(request, 'academic/assignment_list.html', context)

@login_required
@user_passes_test(is_teacher_or_admin)
def create_assignment(request):
    if request.method == 'POST':
        form = AssignmentForm(request.POST, request.FILES, teacher=request.user.teacher_profile)
        if form.is_valid():
            assignment = form.save(commit=False)
            assignment.teacher = request.user.teacher_profile
            assignment.save()
            messages.success(request, 'Assignment created successfully!')
            return redirect('academic:assignment_list')
    else:
        form = AssignmentForm(teacher=request.user.teacher_profile)
    
    context = {'form': form}
    return render(request, 'academic/create_assignment.html', context)

@login_required
def student_assignments(request):
    """View for students to see their assignments"""
    if request.user.user_type != 'student':
        messages.error(request, 'Access denied.')
        return redirect('accounts:dashboard')
    
    try:
        enrollment = request.user.student_profile.get_current_enrollment()
        
        if enrollment:
            assignments = Assignment.objects.filter(
                class_assigned=enrollment.class_enrolled,
                is_active=True
            ).select_related('subject', 'teacher__user').order_by('-assigned_date')
        else:
            assignments = Assignment.objects.none()
        
        # Get submission status for each assignment
        assignment_data = []
        submitted_count = 0
        pending_count = 0
        overdue_count = 0
        
        for assignment in assignments:
            try:
                submission = AssignmentSubmission.objects.get(
                    assignment=assignment,
                    student=request.user.student_profile
                )
            except AssignmentSubmission.DoesNotExist:
                submission = None
            
            is_overdue = assignment.due_date < timezone.now() if not submission else False
            
            assignment_data.append({
                'assignment': assignment,
                'submission': submission,
                'is_overdue': is_overdue
            })
            
            # Count statistics
            if submission:
                submitted_count += 1
            elif is_overdue:
                overdue_count += 1
            else:
                pending_count += 1
        
        context = {
            'assignment_data': assignment_data,
            'enrollment': enrollment,
            'submitted_count': submitted_count,
            'pending_count': pending_count,
            'overdue_count': overdue_count
        }
        
    except StudentEnrollment.DoesNotExist:
        messages.error(request, 'You are not enrolled in any class.')
        context = {'assignment_data': []}
    
    return render(request, 'academic/student_assignments.html', context)

@login_required
def course_detail(request, course_id):
    """Detailed view of a course with students and teachers"""
    course = get_object_or_404(Course, id=course_id)
    
    # Get classes for this course
    classes = Class.objects.filter(course=course).annotate(
        student_count=Count('studentenrollment', filter=Q(studentenrollment__is_active=True))
    )
    
    # Get subjects for this course
    subjects = Subject.objects.filter(course=course).prefetch_related('teachersubjectassignment_set__teacher__user')
    
    # Get teacher assignments for this course
    teacher_assignments = TeacherSubjectAssignment.objects.filter(
        subject__course=course
    ).select_related('teacher__user', 'subject', 'class_assigned')
    
    # Calculate statistics
    total_students = StudentEnrollment.objects.filter(
        class_enrolled__course=course,
        is_active=True
    ).count()
    
    total_teachers = teacher_assignments.values('teacher').distinct().count()
    
    context = {
        'course': course,
        'classes': classes,
        'subjects': subjects,
        'teacher_assignments': teacher_assignments,
        'total_students': total_students,
        'total_teachers': total_teachers,
        'can_manage': request.user.user_type == 'admin'
    }
    
    return render(request, 'academic/course_detail.html', context)

@login_required
@user_passes_test(is_admin)
def create_course(request):
    """Create a new course"""
    if request.method == 'POST':
        form = CourseForm(request.POST)
        if form.is_valid():
            course = form.save()
            messages.success(request, f'Course "{course.name}" created successfully!')
            return redirect('academic:course_detail', course_id=course.id)
    else:
        form = CourseForm()
    
    context = {'form': form, 'title': 'Create New Course'}
    return render(request, 'academic/course_form.html', context)

@login_required
@user_passes_test(is_admin)
def create_course_enhanced(request):
    """Enhanced course creation with subjects, classes, and student enrollment"""
    if request.method == 'POST':
        # Handle course creation
        course_form = EnhancedCourseForm(request.POST)
        
        if course_form.is_valid():
            course = course_form.save()
            
            # Process subjects
            subjects_data = []
            subject_count = 0
            
            # Count how many subjects were submitted
            for key in request.POST.keys():
                if key.startswith('subject_name_'):
                    subject_count += 1
            
            # Process each subject
            for i in range(subject_count):
                subject_name = request.POST.get(f'subject_name_{i}')
                subject_code = request.POST.get(f'subject_code_{i}')
                subject_year = request.POST.get(f'subject_year_{i}')
                subject_semester = request.POST.get(f'subject_semester_{i}')
                subject_credits = request.POST.get(f'subject_credits_{i}')
                
                if subject_name and subject_code and subject_year and subject_semester:
                    try:
                        subject = Subject.objects.create(
                            name=subject_name,
                            code=subject_code,
                            course=course,
                            year=int(subject_year),
                            semester=int(subject_semester),
                            credits=int(subject_credits) if subject_credits else 3
                        )
                        subjects_data.append(subject)
                    except Exception as e:
                        messages.error(request, f'Error creating subject {subject_name}: {str(e)}')
            
            # Process classes and store them for student enrollment
            classes_data = []
            class_count = 0
            
            # Count how many classes were submitted
            for key in request.POST.keys():
                if key.startswith('class_name_'):
                    class_count += 1
            
            # Process each class
            for i in range(class_count):
                class_name = request.POST.get(f'class_name_{i}')
                class_year = request.POST.get(f'class_year_{i}')
                class_semester = request.POST.get(f'class_semester_{i}')
                class_section = request.POST.get(f'class_section_{i}')
                class_academic_year = request.POST.get(f'class_academic_year_{i}')
                class_teacher = request.POST.get(f'class_teacher_{i}')
                
                if class_name and class_year and class_semester and class_section and class_academic_year:
                    try:
                        academic_year = AcademicYear.objects.get(id=class_academic_year)
                        teacher = TeacherProfile.objects.get(id=class_teacher) if class_teacher else None
                        
                        class_obj = Class.objects.create(
                            name=class_name,
                            course=course,
                            year=int(class_year),
                            semester=int(class_semester),
                            section=class_section,
                            academic_year=academic_year,
                            class_teacher=teacher
                        )
                        classes_data.append((i, class_obj))  # Store index and class object
                    except Exception as e:
                        messages.error(request, f'Error creating class {class_name}: {str(e)}')
            
            # Process student enrollments
            enrollment_count = 0
            enrolled_students = 0
            
            # Count how many students were submitted
            for key in request.POST.keys():
                if key.startswith('student_') and not key.startswith('student_class_'):
                    enrollment_count += 1
            
            # Process each student enrollment
            for i in range(enrollment_count):
                student_id = request.POST.get(f'student_{i}')
                student_class_index = request.POST.get(f'student_class_{i}')
                
                if student_id and student_class_index:
                    try:
                        student = StudentProfile.objects.get(id=student_id)
                        
                        # Find the class object by index
                        class_obj = None
                        for class_index, class_instance in classes_data:
                            if str(class_index) == str(student_class_index):
                                class_obj = class_instance
                                break
                        
                        if class_obj:
                            # Check if enrollment already exists
                            existing_enrollment = StudentEnrollment.objects.filter(
                                student=student,
                                class_enrolled=class_obj
                            ).first()
                            
                            if not existing_enrollment:
                                StudentEnrollment.objects.create(
                                    student=student,
                                    class_enrolled=class_obj,
                                    is_active=True
                                )
                                enrolled_students += 1
                            else:
                                existing_enrollment.is_active = True
                                existing_enrollment.save()
                                enrolled_students += 1
                        else:
                            messages.error(request, f'Could not find class for student enrollment')
                            
                    except Exception as e:
                        messages.error(request, f'Error enrolling student: {str(e)}')
            
            success_message = f'Course "{course.name}" created successfully!'
            if subjects_data:
                success_message += f' Added {len(subjects_data)} subjects.'
            if classes_data:
                success_message += f' Created {len(classes_data)} classes.'
            if enrolled_students:
                success_message += f' Enrolled {enrolled_students} students.'
                
            messages.success(request, success_message)
            return redirect('academic:course_detail', course_id=course.id)
        else:
            messages.error(request, 'Please correct the errors in the course information.')
    else:
        course_form = EnhancedCourseForm()
    
    # Get data for dropdowns
    academic_years = AcademicYear.objects.all().order_by('-year')
    teachers = TeacherProfile.objects.select_related('user').all()
    students = StudentProfile.objects.select_related('user').all()
    
    # Convert to JSON for JavaScript
    import json
    academic_years_json = json.dumps([
        {'id': year.id, 'year': year.year} for year in academic_years
    ])
    teachers_json = json.dumps([
        {'id': teacher.id, 'name': teacher.user.get_full_name()} for teacher in teachers
    ])
    students_json = json.dumps([
        {'id': student.id, 'name': student.user.get_full_name(), 'student_id': student.student_id} 
        for student in students
    ])
    
    context = {
        'form': course_form,
        'academic_years': academic_years_json,
        'teachers': teachers_json,
        'students': students_json,
        'title': 'Create New Course'
    }
    return render(request, 'academic/course_form_enhanced.html', context)

@login_required
@user_passes_test(is_admin)
def edit_course(request, course_id):
    """Edit an existing course"""
    course = get_object_or_404(Course, id=course_id)
    
    if request.method == 'POST':
        form = CourseForm(request.POST, instance=course)
        if form.is_valid():
            course = form.save()
            messages.success(request, f'Course "{course.name}" updated successfully!')
            return redirect('academic:course_detail', course_id=course.id)
    else:
        form = CourseForm(instance=course)
    
    context = {'form': form, 'course': course, 'title': 'Edit Course'}
    return render(request, 'academic/course_form.html', context)

@login_required
def teacher_assignments(request):
    """View for managing teacher subject assignments"""
    assignments = TeacherSubjectAssignment.objects.select_related(
        'teacher__user', 'subject', 'class_assigned__course', 'academic_year'
    )
    
    # Filter based on user type
    if request.user.user_type == 'teacher':
        assignments = assignments.filter(teacher=request.user.teacher_profile)
    
    context = {
        'assignments': assignments,
        'can_manage': request.user.user_type == 'admin'
    }
@login_required
def submit_assignment(request, assignment_id):
    """View for students to submit assignments"""
    if request.user.user_type != 'student':
        messages.error(request, 'Access denied.')
        return redirect('accounts:dashboard')
    
    assignment = get_object_or_404(Assignment, id=assignment_id, is_active=True)
    
    # Check if student is enrolled in the class
    try:
        enrollment = StudentEnrollment.objects.filter(
            student=request.user.student_profile,
            class_enrolled=assignment.class_assigned,
            is_active=True
        ).first()
        
        if not enrollment:
            messages.error(request, 'You are not enrolled in this class.')
            return redirect('academic:student_assignments')
    except (StudentProfile.DoesNotExist, AttributeError):
        messages.error(request, 'You are not enrolled in this class.')
        return redirect('academic:student_assignments')
    
    # Check if already submitted
    try:
        submission = AssignmentSubmission.objects.get(
            assignment=assignment,
            student=request.user.student_profile
        )
        is_resubmission = True
    except AssignmentSubmission.DoesNotExist:
        submission = None
        is_resubmission = False
    
    if request.method == 'POST':
        form = AssignmentSubmissionForm(request.POST, request.FILES, instance=submission)
        if form.is_valid():
            submission = form.save(commit=False)
            submission.assignment = assignment
            submission.student = request.user.student_profile
            submission.save()
            
            action = 'resubmitted' if is_resubmission else 'submitted'
            messages.success(request, f'Assignment {action} successfully!')
            return redirect('academic:student_assignments')
    else:
        form = AssignmentSubmissionForm(instance=submission)
    
    context = {
        'assignment': assignment,
        'form': form,
        'submission': submission,
        'is_resubmission': is_resubmission,
        'is_overdue': assignment.due_date < timezone.now()
    }
    
    return render(request, 'academic/submit_assignment.html', context)

@login_required
def teacher_class_students(request, class_id):
    """View for teachers to see students in their classes"""
    class_obj = get_object_or_404(Class, id=class_id)
    
    # Check if teacher has access to this class
    if request.user.user_type == 'teacher':
        teacher_assignments = TeacherSubjectAssignment.objects.filter(
            teacher=request.user.teacher_profile,
            class_assigned=class_obj
        )
        if not teacher_assignments.exists():
            messages.error(request, 'You do not have access to this class.')
            return redirect('accounts:dashboard')
    elif request.user.user_type != 'admin':
        messages.error(request, 'Access denied.')
        return redirect('accounts:dashboard')
    
    # Get students enrolled in this class
    enrollments = StudentEnrollment.objects.filter(
        class_enrolled=class_obj,
        is_active=True
    ).select_related('student__user').order_by('student__user__first_name', 'student__user__last_name')
    
    # Get attendance summary for each student
    from attendance.models import AttendanceRecord
    student_data = []
    
    for enrollment in enrollments:
        student = enrollment.student
        
        # Calculate attendance statistics
        attendance_records = AttendanceRecord.objects.filter(student=student)
        total_sessions = attendance_records.count()
        present_sessions = attendance_records.filter(status__in=['present', 'late']).count()
        attendance_percentage = (present_sessions / total_sessions * 100) if total_sessions > 0 else 0
        
        student_data.append({
            'enrollment': enrollment,
            'student': student,
            'total_sessions': total_sessions,
            'present_sessions': present_sessions,
            'attendance_percentage': round(attendance_percentage, 2)
        })
    
    context = {
        'class_obj': class_obj,
        'student_data': student_data,
        'can_manage': request.user.user_type in ['admin', 'teacher']
    }
    
    return render(request, 'academic/teacher_class_students.html', context)
@login_required
def student_enrollment_report(request):
    """Detailed report of student enrollments per course"""
    if request.user.user_type not in ['admin', 'teacher']:
        messages.error(request, 'Access denied.')
        return redirect('accounts:dashboard')
    
    # Get course-wise enrollment data
    course_enrollments = []
    courses = Course.objects.all()
    
    for course in courses:
        classes = Class.objects.filter(course=course)
        student_count = StudentEnrollment.objects.filter(
            class_enrolled__course=course,
            is_active=True
        ).count()
        
        course_enrollments.append({
            'course': course,
            'class_count': classes.count(),
            'student_count': student_count
        })
    
    # Get class-wise enrollment data
    class_enrollments = []
    classes = Class.objects.select_related('course', 'class_teacher__user')
    
    for class_obj in classes:
        student_count = StudentEnrollment.objects.filter(
            class_enrolled=class_obj,
            is_active=True
        ).count()
        
        class_enrollments.append({
            'class': class_obj,
            'student_count': student_count
        })
    
    # Calculate summary statistics
    total_students = StudentEnrollment.objects.filter(is_active=True).count()
    active_enrollments = StudentEnrollment.objects.filter(is_active=True).count()
    total_courses = Course.objects.count()
    total_classes = Class.objects.count()
    
    context = {
        'course_enrollments': course_enrollments,
        'class_enrollments': class_enrollments,
        'total_students': total_students,
        'active_enrollments': active_enrollments,
        'total_courses': total_courses,
        'total_classes': total_classes
    }
    
    return render(request, 'academic/student_enrollment_report.html', context)
@login_required
@user_passes_test(is_admin)
def create_class(request):
    """Create a new class"""
    course_id = request.GET.get('course')
    course = None
    if course_id:
        course = get_object_or_404(Course, id=course_id)
    
    if request.method == 'POST':
        form = ClassForm(request.POST)
        if form.is_valid():
            class_obj = form.save()
            messages.success(request, f'Class "{class_obj.name}" created successfully!')
            if course:
                return redirect('academic:course_detail', course_id=course.id)
            return redirect('academic:class_list')
    else:
        form = ClassForm()
        if course:
            form.fields['course'].initial = course
    
    context = {
        'form': form,
        'course': course,
        'title': 'Create New Class'
    }
    return render(request, 'academic/class_form.html', context)

@login_required
def class_detail(request, class_id):
    """Detailed view of a class"""
    class_obj = get_object_or_404(Class, id=class_id)
    
    # Get students enrolled in this class
    enrollments = StudentEnrollment.objects.filter(
        class_enrolled=class_obj,
        is_active=True
    ).select_related('student__user')
    
    # Get teacher assignments for this class
    teacher_assignments = TeacherSubjectAssignment.objects.filter(
        class_assigned=class_obj
    ).select_related('teacher__user', 'subject')
    
    context = {
        'class_obj': class_obj,
        'enrollments': enrollments,
        'teacher_assignments': teacher_assignments,
        'can_manage': request.user.user_type == 'admin'
    }
    
    return render(request, 'academic/class_detail.html', context)

@login_required
@user_passes_test(is_admin)
def create_subject(request):
    """Create a new subject"""
    course_id = request.GET.get('course')
    course = None
    if course_id:
        course = get_object_or_404(Course, id=course_id)
    
    if request.method == 'POST':
        form = SubjectForm(request.POST)
        if form.is_valid():
            subject = form.save()
            messages.success(request, f'Subject "{subject.name}" created successfully!')
            if course:
                return redirect('academic:course_detail', course_id=course.id)
            return redirect('academic:subject_list')
    else:
        form = SubjectForm()
        if course:
            form.fields['course'].initial = course
    
    context = {
        'form': form,
        'course': course,
        'title': 'Create New Subject'
    }
    return render(request, 'academic/subject_form.html', context)

@login_required
@user_passes_test(is_admin)
def edit_subject(request, subject_id):
    """Edit an existing subject"""
    subject = get_object_or_404(Subject, id=subject_id)
    
    if request.method == 'POST':
        form = SubjectForm(request.POST, instance=subject)
        if form.is_valid():
            subject = form.save()
            messages.success(request, f'Subject "{subject.name}" updated successfully!')
            return redirect('academic:course_detail', course_id=subject.course.id)
    else:
        form = SubjectForm(instance=subject)
    
    context = {
        'form': form,
        'subject': subject,
        'title': 'Edit Subject'
    }
    return render(request, 'academic/subject_form.html', context)

@login_required
@user_passes_test(is_admin)
def assign_teacher(request):
    """Assign a teacher to a subject and class"""
    course_id = request.GET.get('course')
    course = None
    if course_id:
        course = get_object_or_404(Course, id=course_id)
    
    if request.method == 'POST':
        form = TeacherSubjectAssignmentForm(request.POST)
        if form.is_valid():
            assignment = form.save()
            messages.success(request, f'Teacher "{assignment.teacher.user.get_full_name()}" assigned to "{assignment.subject.name}" successfully!')
            if course:
                return redirect('academic:course_detail', course_id=course.id)
            return redirect('academic:teacher_assignments')
    else:
        form = TeacherSubjectAssignmentForm()
        if course:
            # Filter subjects and classes for this course
            form.fields['subject'].queryset = Subject.objects.filter(course=course)
            form.fields['class_assigned'].queryset = Class.objects.filter(course=course)
    
    context = {
        'form': form,
        'course': course,
        'title': 'Assign Teacher'
    }
    return render(request, 'academic/teacher_assignment_form.html', context)

@login_required
@user_passes_test(is_admin)
def edit_teacher_assignment(request, assignment_id):
    """Edit a teacher assignment"""
    assignment = get_object_or_404(TeacherSubjectAssignment, id=assignment_id)
    
    if request.method == 'POST':
        form = TeacherSubjectAssignmentForm(request.POST, instance=assignment)
        if form.is_valid():
            assignment = form.save()
            messages.success(request, f'Teacher assignment updated successfully!')
            return redirect('academic:teacher_assignments')
    else:
        form = TeacherSubjectAssignmentForm(instance=assignment)
    
    context = {
        'form': form,
        'assignment': assignment,
        'title': 'Edit Teacher Assignment'
    }
    return render(request, 'academic/teacher_assignment_form.html', context)
@login_required
@user_passes_test(is_teacher_or_admin)
def assignment_detail(request, assignment_id):
    """View assignment details"""
    assignment = get_object_or_404(Assignment, id=assignment_id)
    
    # Check if user has permission to view this assignment
    if request.user.user_type == 'teacher' and assignment.teacher != request.user.teacher_profile:
        messages.error(request, 'You do not have permission to view this assignment.')
        return redirect('academic:assignment_list')
    
    # Get submissions for this assignment
    submissions = AssignmentSubmission.objects.filter(
        assignment=assignment
    ).select_related('student__user').order_by('-submitted_at')
    
    # Calculate statistics
    total_students = assignment.class_assigned.studentenrollment_set.filter(is_active=True).count()
    submitted_count = submissions.count()
    pending_count = total_students - submitted_count
    submission_percentage = (submitted_count / total_students * 100) if total_students > 0 else 0
    
    context = {
        'assignment': assignment,
        'submissions': submissions,
        'total_students': total_students,
        'submitted_count': submitted_count,
        'pending_count': pending_count,
        'submission_percentage': round(submission_percentage, 1),
    }
    
    return render(request, 'academic/assignment_detail.html', context)

@login_required
@user_passes_test(is_teacher_or_admin)
def edit_assignment(request, assignment_id):
    """Edit an existing assignment"""
    assignment = get_object_or_404(Assignment, id=assignment_id)
    
    # Check if user has permission to edit this assignment
    if request.user.user_type == 'teacher' and assignment.teacher != request.user.teacher_profile:
        messages.error(request, 'You do not have permission to edit this assignment.')
        return redirect('academic:assignment_list')
    
    if request.method == 'POST':
        form = AssignmentForm(request.POST, request.FILES, instance=assignment, teacher=request.user.teacher_profile)
        if form.is_valid():
            form.save()
            messages.success(request, f'Assignment "{assignment.title}" updated successfully!')
            return redirect('academic:assignment_detail', assignment_id=assignment.id)
    else:
        form = AssignmentForm(instance=assignment, teacher=request.user.teacher_profile)
    
    context = {'form': form, 'assignment': assignment}
    return render(request, 'academic/edit_assignment.html', context)

@login_required
@user_passes_test(is_teacher_or_admin)
@login_required
@user_passes_test(is_admin)
def manage_student_enrollment(request):
    """Admin view to manage student enrollments with department and course filtering"""
    enrollments = StudentEnrollment.objects.select_related(
        'student__user', 
        'class_enrolled__course__department',
        'class_enrolled__course',
        'class_enrolled__academic_year'
    ).order_by('-enrollment_date')
    
    # Apply filters
    department_filter = request.GET.get('department')
    course_filter = request.GET.get('course')
    status_filter = request.GET.get('status')
    search = request.GET.get('search', '')
    
    if department_filter:
        enrollments = enrollments.filter(class_enrolled__course__department_id=department_filter)
    
    if course_filter:
        enrollments = enrollments.filter(class_enrolled__course_id=course_filter)
    
    if status_filter:
        if status_filter == 'active':
            enrollments = enrollments.filter(is_active=True)
        elif status_filter == 'inactive':
            enrollments = enrollments.filter(is_active=False)
    
    if search:
        enrollments = enrollments.filter(
            Q(student__user__first_name__icontains=search) |
            Q(student__user__last_name__icontains=search) |
            Q(student__user__username__icontains=search) |
            Q(student__student_id__icontains=search)
        )
    
    # Pagination
    paginator = Paginator(enrollments, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Get filter options
    departments = Department.objects.all()
    courses = Course.objects.all()
    if department_filter:
        courses = courses.filter(department_id=department_filter)
    
    # Calculate statistics
    total_enrollments = enrollments.count()
    active_enrollments = enrollments.filter(is_active=True).count()
    inactive_enrollments = total_enrollments - active_enrollments
    
    # Get enrollment statistics by department
    dept_stats = []
    for dept in departments:
        dept_enrollment_count = StudentEnrollment.objects.filter(
            class_enrolled__course__department=dept,
            is_active=True
        ).count()
        dept_stats.append({
            'department': dept,
            'enrollment_count': dept_enrollment_count
        })
    
    context = {
        'page_obj': page_obj,
        'departments': departments,
        'courses': courses,
        'department_filter': department_filter,
        'course_filter': course_filter,
        'status_filter': status_filter,
        'search': search,
        'total_enrollments': total_enrollments,
        'active_enrollments': active_enrollments,
        'inactive_enrollments': inactive_enrollments,
        'dept_stats': dept_stats,
    }
    
    return render(request, 'academic/manage_student_enrollment.html', context)

@login_required
@user_passes_test(is_admin)
def create_student_enrollment(request):
    """Create a new student enrollment with department and course selection"""
    if request.method == 'POST':
        form = StudentEnrollmentForm(request.POST)
        if form.is_valid():
            enrollment = form.save()
            messages.success(request, f'Student "{enrollment.student.user.get_full_name()}" enrolled in "{enrollment.class_enrolled}" successfully!')
            return redirect('academic:manage_student_enrollment')
    else:
        form = StudentEnrollmentForm()
    
    # Get data for AJAX filtering
    departments = Department.objects.all()
    courses = Course.objects.all()
    classes = Class.objects.all()
    
    context = {
        'form': form,
        'departments': departments,
        'courses': courses,
        'classes': classes,
        'title': 'Enroll Student'
    }
    
    return render(request, 'academic/create_student_enrollment.html', context)

@login_required
@user_passes_test(is_admin)
def edit_student_enrollment(request, enrollment_id):
    """Edit an existing student enrollment"""
    enrollment = get_object_or_404(StudentEnrollment, id=enrollment_id)
    
    if request.method == 'POST':
        form = StudentEnrollmentForm(request.POST, instance=enrollment)
        if form.is_valid():
            enrollment = form.save()
            messages.success(request, f'Enrollment for "{enrollment.student.user.get_full_name()}" updated successfully!')
            return redirect('academic:manage_student_enrollment')
    else:
        form = StudentEnrollmentForm(instance=enrollment)
    
    # Get data for AJAX filtering
    departments = Department.objects.all()
    courses = Course.objects.all()
    classes = Class.objects.all()
    
    context = {
        'form': form,
        'enrollment': enrollment,
        'departments': departments,
        'courses': courses,
        'classes': classes,
        'title': 'Edit Student Enrollment'
    }
    
    return render(request, 'academic/edit_student_enrollment.html', context)

def assignment_submissions(request, assignment_id):
    """View all submissions for an assignment"""
    assignment = get_object_or_404(Assignment, id=assignment_id)
    
    # Check if user has permission to view submissions
    if request.user.user_type == 'teacher' and assignment.teacher != request.user.teacher_profile:
        messages.error(request, 'You do not have permission to view these submissions.')
        return redirect('academic:assignment_list')
    
    # Get all submissions
    submissions = AssignmentSubmission.objects.filter(
        assignment=assignment
    ).select_related('student__user').order_by('-submitted_at')
    
    # Get students who haven't submitted
    enrolled_students = assignment.class_assigned.studentenrollment_set.filter(
        is_active=True
    ).select_related('student__user')
    
    submitted_student_ids = submissions.values_list('student_id', flat=True)
    pending_students = enrolled_students.exclude(student_id__in=submitted_student_ids)
    
    context = {
        'assignment': assignment,
        'submissions': submissions,
        'pending_students': pending_students,
        'total_students': enrolled_students.count(),
        'submitted_count': submissions.count(),
    }
    
    return render(request, 'academic/assignment_submissions.html', context)


