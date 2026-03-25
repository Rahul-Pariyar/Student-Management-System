from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.db.models import Q, Count, Avg
from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
import json
from .models import AttendanceSession, AttendanceRecord, AttendanceSummary
from .forms import AttendanceSessionForm, QuickAttendanceForm, AttendanceFilterForm, AttendanceRecordFormSet
from academic.models import TeacherSubjectAssignment, StudentEnrollment, Class
from accounts.models import StudentProfile

def is_teacher_or_admin(user):
    return user.is_authenticated and user.user_type in ['admin', 'teacher']

@login_required
@user_passes_test(is_teacher_or_admin)
def get_students_for_assignment(request):
    """AJAX view to get students for a specific teacher assignment"""
    if request.method == 'GET':
        assignment_id = request.GET.get('assignment_id')
        
        if not assignment_id:
            return JsonResponse({'error': 'Assignment ID is required'}, status=400)
        
        try:
            assignment = TeacherSubjectAssignment.objects.get(
                id=assignment_id,
                teacher=request.user.teacher_profile
            )
            
            # Get students enrolled in this class
            enrollments = StudentEnrollment.objects.filter(
                class_enrolled=assignment.class_assigned,
                is_active=True
            ).select_related('student__user')
            
            students_data = []
            for enrollment in enrollments:
                # Get student name with fallback to username
                student_name = enrollment.student.user.get_full_name()
                if not student_name.strip():
                    student_name = enrollment.student.user.username
                
                students_data.append({
                    'id': enrollment.student.id,
                    'name': student_name,
                    'student_id': enrollment.student.student_id,
                    'email': enrollment.student.user.email
                })
            
            return JsonResponse({
                'students': students_data,
                'assignment': {
                    'id': assignment.id,
                    'subject': assignment.subject.name,
                    'class': assignment.class_assigned.name
                }
            })
            
        except TeacherSubjectAssignment.DoesNotExist:
            return JsonResponse({'error': 'Assignment not found'}, status=404)
    
    return JsonResponse({'error': 'Invalid request method'}, status=405)

@login_required
@user_passes_test(is_teacher_or_admin)
def save_attendance_ajax(request):
    """AJAX view to save attendance data"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            assignment_id = data.get('assignment_id')
            date = data.get('date')
            start_time = data.get('start_time')
            end_time = data.get('end_time')
            topic_covered = data.get('topic_covered', '')
            attendance_data = data.get('attendance_data', [])
            
            if not all([assignment_id, date, start_time, end_time]):
                return JsonResponse({'error': 'Missing required fields'}, status=400)
            
            # Get the teacher assignment
            assignment = TeacherSubjectAssignment.objects.get(
                id=assignment_id,
                teacher=request.user.teacher_profile
            )
            
            # Create or get attendance session
            session, created = AttendanceSession.objects.get_or_create(
                teacher_assignment=assignment,
                date=date,
                start_time=start_time,
                defaults={
                    'end_time': end_time,
                    'topic_covered': topic_covered,
                    'is_completed': True
                }
            )
            
            if not created:
                # Update existing session
                session.end_time = end_time
                session.topic_covered = topic_covered
                session.is_completed = True
                session.save()
            
            # Save attendance records
            saved_count = 0
            for record_data in attendance_data:
                student_id = record_data.get('student_id')
                status = record_data.get('status')
                remarks = record_data.get('remarks', '')
                
                if student_id and status:
                    try:
                        student = StudentProfile.objects.get(id=student_id)
                        
                        # Create or update attendance record
                        attendance_record, created = AttendanceRecord.objects.get_or_create(
                            session=session,
                            student=student,
                            defaults={
                                'status': status,
                                'remarks': remarks
                            }
                        )
                        
                        if not created:
                            attendance_record.status = status
                            attendance_record.remarks = remarks
                            attendance_record.save()
                        
                        saved_count += 1
                        
                    except StudentProfile.DoesNotExist:
                        continue
            
            return JsonResponse({
                'success': True,
                'message': f'Attendance saved successfully for {saved_count} students!',
                'session_id': session.id
            })
            
        except TeacherSubjectAssignment.DoesNotExist:
            return JsonResponse({'error': 'Assignment not found'}, status=404)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Invalid request method'}, status=405)

@login_required
@user_passes_test(is_teacher_or_admin)
def mark_attendance(request):
    """Main attendance marking view for teachers"""
    if request.method == 'POST':
        if 'create_session' in request.POST:
            # Create new attendance session
            form = QuickAttendanceForm(request.POST, teacher=request.user.teacher_profile)
            if form.is_valid():
                # Create attendance session
                session = AttendanceSession.objects.create(
                    teacher_assignment=form.cleaned_data['teacher_assignment'],
                    date=form.cleaned_data['date'],
                    start_time=form.cleaned_data['start_time'],
                    end_time=form.cleaned_data['end_time'],
                    topic_covered=form.cleaned_data['topic_covered']
                )
                return redirect('attendance:mark_attendance_session', session_id=session.id)
        
        elif 'session_id' in request.POST:
            # Mark attendance for existing session
            session_id = request.POST.get('session_id')
            session = get_object_or_404(AttendanceSession, id=session_id)
            
            # Get all students in the class
            enrollments = StudentEnrollment.objects.filter(
                class_enrolled=session.teacher_assignment.class_assigned,
                is_active=True
            )
            
            # Process attendance data
            for enrollment in enrollments:
                student_id = enrollment.student.id
                status = request.POST.get(f'status_{student_id}', 'absent')
                remarks = request.POST.get(f'remarks_{student_id}', '')
                
                # Create or update attendance record
                attendance_record, created = AttendanceRecord.objects.get_or_create(
                    session=session,
                    student=enrollment.student,
                    defaults={'status': status, 'remarks': remarks}
                )
                
                if not created:
                    attendance_record.status = status
                    attendance_record.remarks = remarks
                    attendance_record.save()
            
            # Mark session as completed
            session.is_completed = True
            session.save()
            
            messages.success(request, f'Attendance marked successfully for {enrollments.count()} students!')
            return redirect('attendance:attendance_reports')
    
    else:
        form = QuickAttendanceForm(teacher=request.user.teacher_profile)
    
    # Get teacher assignments for the dropdown
    teacher_assignments = TeacherSubjectAssignment.objects.filter(
        teacher=request.user.teacher_profile
    ).select_related('subject', 'class_assigned')
    
    # Get recent sessions for this teacher
    recent_sessions = AttendanceSession.objects.filter(
        teacher_assignment__teacher=request.user.teacher_profile
    ).order_by('-date', '-start_time')[:5]
    
    context = {
        'form': form,
        'teacher_assignments': teacher_assignments,
        'recent_sessions': recent_sessions,
        'today': timezone.now().date()
    }
    
    return render(request, 'attendance/mark_attendance.html', context)

@login_required
@user_passes_test(is_teacher_or_admin)
def mark_attendance_session(request, session_id):
    """Mark attendance for a specific session"""
    session = get_object_or_404(AttendanceSession, id=session_id)
    
    # Check if user has permission to mark attendance for this session
    if request.user.user_type == 'teacher' and session.teacher_assignment.teacher != request.user.teacher_profile:
        messages.error(request, 'You do not have permission to mark attendance for this session.')
        return redirect('attendance:mark_attendance')
    
    # Get all students in the class
    enrollments = StudentEnrollment.objects.filter(
        class_enrolled=session.teacher_assignment.class_assigned,
        is_active=True
    ).select_related('student__user')
    
    # Get existing attendance records
    existing_records = {}
    for record in AttendanceRecord.objects.filter(session=session):
        existing_records[record.student.id] = record
    
    # Prepare student data with existing attendance
    students_data = []
    for enrollment in enrollments:
        existing_record = existing_records.get(enrollment.student.id)
        students_data.append({
            'student': enrollment.student,
            'existing_status': existing_record.status if existing_record else 'present',
            'existing_remarks': existing_record.remarks if existing_record else ''
        })
    
    context = {
        'session': session,
        'students_data': students_data,
        'attendance_choices': AttendanceRecord.ATTENDANCE_CHOICES
    }
    
    return render(request, 'attendance/mark_attendance_session.html', context)

@login_required
def view_attendance(request):
    """View attendance records - accessible by all user types"""
    
    if request.user.user_type == 'student':
        # Student can only view their own attendance
        try:
            student_profile = request.user.student_profile
            enrollment = student_profile.get_current_enrollment()
            
            if not enrollment:
                messages.warning(request, 'You are not enrolled in any class.')
                context = {
                    'attendance_records': [],
                    'filter_form': None,
                    'enrollment': None,
                    'total_sessions': 0,
                    'present_sessions': 0,
                    'absent_sessions': 0,
                    'attendance_percentage': 0
                }
                return render(request, 'attendance/view_attendance.html', context)
            
            filter_form = AttendanceFilterForm(request.GET, user=request.user)
            
            attendance_records = AttendanceRecord.objects.filter(
                student=student_profile
            ).select_related('session__teacher_assignment__subject', 'session__teacher_assignment__teacher__user')
            
            # Apply filters
            if filter_form.is_valid():
                if filter_form.cleaned_data.get('subject'):
                    attendance_records = attendance_records.filter(
                        session__teacher_assignment__subject=filter_form.cleaned_data['subject']
                    )
                if filter_form.cleaned_data.get('date_from'):
                    attendance_records = attendance_records.filter(
                        session__date__gte=filter_form.cleaned_data['date_from']
                    )
                if filter_form.cleaned_data.get('date_to'):
                    attendance_records = attendance_records.filter(
                        session__date__lte=filter_form.cleaned_data['date_to']
                    )
                if filter_form.cleaned_data.get('status'):
                    attendance_records = attendance_records.filter(
                        status=filter_form.cleaned_data['status']
                    )
            
            attendance_records = attendance_records.order_by('-session__date', '-session__start_time')
            
            # Calculate attendance summary
            total_sessions = attendance_records.count()
            present_sessions = attendance_records.filter(status__in=['present', 'late']).count()
            absent_sessions = total_sessions - present_sessions
            attendance_percentage = (present_sessions / total_sessions * 100) if total_sessions > 0 else 0
            
            context = {
                'attendance_records': attendance_records,
                'filter_form': filter_form,
                'enrollment': enrollment,
                'total_sessions': total_sessions,
                'present_sessions': present_sessions,
                'absent_sessions': absent_sessions,
                'attendance_percentage': round(attendance_percentage, 2)
            }
            
        except Exception as e:
            print(f"Error in student attendance view: {e}")
            import traceback
            traceback.print_exc()
            messages.error(request, 'An error occurred while loading attendance data.')
            context = {
                'attendance_records': [],
                'filter_form': None,
                'enrollment': None,
                'total_sessions': 0,
                'present_sessions': 0,
                'absent_sessions': 0,
                'attendance_percentage': 0
            }
    
    elif request.user.user_type == 'teacher':
        filter_form = AttendanceFilterForm(request.GET, user=request.user)
        
        # Teacher can view attendance for their classes
        teacher_assignments = TeacherSubjectAssignment.objects.filter(
            teacher=request.user.teacher_profile
        )
        
        attendance_records = AttendanceRecord.objects.filter(
            session__teacher_assignment__in=teacher_assignments
        ).select_related('student__user', 'session__teacher_assignment__subject')
        
        # Apply filters
        if filter_form.is_valid():
            if filter_form.cleaned_data.get('subject'):
                attendance_records = attendance_records.filter(
                    session__teacher_assignment__subject=filter_form.cleaned_data['subject']
                )
            if filter_form.cleaned_data.get('class_filter'):
                attendance_records = attendance_records.filter(
                    session__teacher_assignment__class_assigned=filter_form.cleaned_data['class_filter']
                )
            if filter_form.cleaned_data.get('date_from'):
                attendance_records = attendance_records.filter(
                    session__date__gte=filter_form.cleaned_data['date_from']
                )
            if filter_form.cleaned_data.get('date_to'):
                attendance_records = attendance_records.filter(
                    session__date__lte=filter_form.cleaned_data['date_to']
                )
            if filter_form.cleaned_data.get('status'):
                attendance_records = attendance_records.filter(
                    status=filter_form.cleaned_data['status']
                )
        
        attendance_records = attendance_records.order_by('-session__date', '-session__start_time')
        
        context = {
            'attendance_records': attendance_records,
            'filter_form': filter_form
        }
    
    else:  # Admin or parent
        filter_form = AttendanceFilterForm(request.GET, user=request.user)
        
        if request.user.user_type == 'parent':
            # Parent can view attendance for their children
            try:
                parent_profile = request.user.parent_profile
                children = parent_profile.children.all()
                
                if not children.exists():
                    messages.warning(request, 'No children linked to your account.')
                    context = {
                        'attendance_records': [],
                        'filter_form': filter_form
                    }
                    return render(request, 'attendance/view_attendance.html', context)
                
                # Get attendance records for all children
                attendance_records = AttendanceRecord.objects.filter(
                    student__in=children
                ).select_related(
                    'student__user', 'session__teacher_assignment__subject', 
                    'session__teacher_assignment__teacher__user'
                )
                
                # Apply filters
                if filter_form.is_valid():
                    if filter_form.cleaned_data.get('subject'):
                        attendance_records = attendance_records.filter(
                            session__teacher_assignment__subject=filter_form.cleaned_data['subject']
                        )
                    if filter_form.cleaned_data.get('class_filter'):
                        attendance_records = attendance_records.filter(
                            session__teacher_assignment__class_assigned=filter_form.cleaned_data['class_filter']
                        )
                    if filter_form.cleaned_data.get('date_from'):
                        attendance_records = attendance_records.filter(
                            session__date__gte=filter_form.cleaned_data['date_from']
                        )
                    if filter_form.cleaned_data.get('date_to'):
                        attendance_records = attendance_records.filter(
                            session__date__lte=filter_form.cleaned_data['date_to']
                        )
                    if filter_form.cleaned_data.get('status'):
                        attendance_records = attendance_records.filter(
                            status=filter_form.cleaned_data['status']
                        )
                
                attendance_records = attendance_records.order_by('-session__date', '-session__start_time')
                
                context = {
                    'attendance_records': attendance_records,
                    'filter_form': filter_form,
                    'children': children
                }
                
            except Exception as e:
                print(f"Error in parent attendance view: {e}")
                import traceback
                traceback.print_exc()
                messages.error(request, 'An error occurred while loading attendance data.')
                context = {
                    'attendance_records': [],
                    'filter_form': filter_form
                }
        else:
            # Admin can view all attendance records
            attendance_records = AttendanceRecord.objects.all().select_related(
                'student__user', 'session__teacher_assignment__subject', 
                'session__teacher_assignment__teacher__user'
            )
            
            # Apply filters (admin has access to all filters)
            if filter_form.is_valid():
                if filter_form.cleaned_data.get('subject'):
                    attendance_records = attendance_records.filter(
                        session__teacher_assignment__subject=filter_form.cleaned_data['subject']
                    )
                if filter_form.cleaned_data.get('class_filter'):
                    attendance_records = attendance_records.filter(
                        session__teacher_assignment__class_assigned=filter_form.cleaned_data['class_filter']
                    )
                if filter_form.cleaned_data.get('date_from'):
                    attendance_records = attendance_records.filter(
                        session__date__gte=filter_form.cleaned_data['date_from']
                    )
                if filter_form.cleaned_data.get('date_to'):
                    attendance_records = attendance_records.filter(
                        session__date__lte=filter_form.cleaned_data['date_to']
                    )
                if filter_form.cleaned_data.get('status'):
                    attendance_records = attendance_records.filter(
                        status=filter_form.cleaned_data['status']
                    )
            
            attendance_records = attendance_records.order_by('-session__date', '-session__start_time')
            
            context = {
                'attendance_records': attendance_records,
                'filter_form': filter_form
            }
    
    return render(request, 'attendance/view_attendance.html', context)

@login_required
def attendance_reports(request):
    """Generate attendance reports"""
    context = {}
    
    if request.user.user_type == 'student':
        # Student attendance summary
        try:
            enrollment = request.user.student_profile.get_current_enrollment()
            
            if enrollment:
                # Get attendance summary by subject
                from academic.models import Subject
                subjects = Subject.objects.filter(
                    course=enrollment.class_enrolled.course,
                    year=enrollment.class_enrolled.year,
                    semester=enrollment.class_enrolled.semester
                )
                
                subject_summaries = []
                for subject in subjects:
                    records = AttendanceRecord.objects.filter(
                        student=request.user.student_profile,
                    session__teacher_assignment__subject=subject
                )
                
                total = records.count()
                present = records.filter(status__in=['present', 'late']).count()
                percentage = (present / total * 100) if total > 0 else 0
                
                subject_summaries.append({
                    'subject': subject,
                    'total_sessions': total,
                    'present_sessions': present,
                    'absent_sessions': total - present,
                    'percentage': round(percentage, 2)
                })
            
                context = {
                    'enrollment': enrollment,
                    'subject_summaries': subject_summaries
                }
            else:
                context = {
                    'enrollment': None,
                    'subject_summaries': []
                }
            
        except (StudentProfile.DoesNotExist, AttributeError):
            messages.error(request, 'You are not enrolled in any class.')
            context = {}
    
    elif request.user.user_type == 'teacher':
        # Teacher's class attendance reports
        teacher_assignments = TeacherSubjectAssignment.objects.filter(
            teacher=request.user.teacher_profile
        ).select_related('subject', 'class_assigned')
        
        class_summaries = []
        for assignment in teacher_assignments:
            # Get all students in this class
            enrollments = StudentEnrollment.objects.filter(
                class_enrolled=assignment.class_assigned,
                is_active=True
            )
            
            # Get attendance sessions for this assignment
            sessions = AttendanceSession.objects.filter(
                teacher_assignment=assignment
            )
            
            total_sessions = sessions.count()
            total_students = enrollments.count()
            
            if total_sessions > 0 and total_students > 0:
                # Calculate average attendance
                total_records = AttendanceRecord.objects.filter(
                    session__in=sessions
                ).count()
                present_records = AttendanceRecord.objects.filter(
                    session__in=sessions,
                    status__in=['present', 'late']
                ).count()
                
                avg_attendance = (present_records / total_records * 100) if total_records > 0 else 0
            else:
                avg_attendance = 0
            
            class_summaries.append({
                'assignment': assignment,
                'total_sessions': total_sessions,
                'total_students': total_students,
                'avg_attendance': round(avg_attendance, 2)
            })
        
        context = {
            'class_summaries': class_summaries
        }
    
    else:  # Admin
        # Overall system attendance reports
        total_students = StudentProfile.objects.count()
        total_sessions = AttendanceSession.objects.count()
        total_records = AttendanceRecord.objects.count()
        present_records = AttendanceRecord.objects.filter(status__in=['present', 'late']).count()
        
        overall_attendance = (present_records / total_records * 100) if total_records > 0 else 0
        
        # Department-wise attendance
        from academic.models import Department
        departments = Department.objects.all()
        dept_summaries = []
        
        for dept in departments:
            dept_records = AttendanceRecord.objects.filter(
                session__teacher_assignment__class_assigned__course__department=dept
            )
            dept_total = dept_records.count()
            dept_present = dept_records.filter(status__in=['present', 'late']).count()
            dept_percentage = (dept_present / dept_total * 100) if dept_total > 0 else 0
            
            dept_summaries.append({
                'department': dept,
                'total_records': dept_total,
                'present_records': dept_present,
                'percentage': round(dept_percentage, 2)
            })
        
        context = {
            'total_students': total_students,
            'total_sessions': total_sessions,
            'total_records': total_records,
            'present_records': present_records,
            'overall_attendance': round(overall_attendance, 2),
            'dept_summaries': dept_summaries
        }
    
    return render(request, 'attendance/attendance_reports.html', context)