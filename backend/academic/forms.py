from django import forms
from .models import (
    AcademicYear, Department, Course, Subject, Class, 
    StudentEnrollment, TeacherSubjectAssignment, Assignment, AssignmentSubmission
)
from accounts.models import StudentProfile, TeacherProfile

class AcademicYearForm(forms.ModelForm):
    class Meta:
        model = AcademicYear
        fields = ['year', 'start_date', 'end_date', 'is_current']
        widgets = {
            'year': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '2023-2024'}),
            'start_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'end_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'is_current': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }

class DepartmentForm(forms.ModelForm):
    class Meta:
        model = Department
        fields = ['name', 'code', 'description', 'head_of_department']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'code': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'head_of_department': forms.Select(attrs={'class': 'form-select'}),
        }

class CourseForm(forms.ModelForm):
    class Meta:
        model = Course
        fields = ['name', 'code', 'department', 'duration_years', 'description']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'code': forms.TextInput(attrs={'class': 'form-control'}),
            'department': forms.Select(attrs={'class': 'form-select'}),
            'duration_years': forms.NumberInput(attrs={'class': 'form-control', 'min': 1, 'max': 6}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }

class EnhancedCourseForm(forms.ModelForm):
    """Enhanced course form with dynamic subject, class, and student enrollment"""
    
    class Meta:
        model = Course
        fields = ['name', 'code', 'department', 'duration_years', 'description']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'code': forms.TextInput(attrs={'class': 'form-control'}),
            'department': forms.Select(attrs={'class': 'form-select'}),
            'duration_years': forms.NumberInput(attrs={'class': 'form-control', 'min': 1, 'max': 6}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Add required attribute to essential fields
        self.fields['name'].required = True
        self.fields['code'].required = True
        self.fields['department'].required = True

class SubjectForm(forms.ModelForm):
    class Meta:
        model = Subject
        fields = ['name', 'code', 'course', 'year', 'semester', 'credits', 'description']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'code': forms.TextInput(attrs={'class': 'form-control'}),
            'course': forms.Select(attrs={'class': 'form-select'}),
            'year': forms.NumberInput(attrs={'class': 'form-control', 'min': 1, 'max': 6}),
            'semester': forms.NumberInput(attrs={'class': 'form-control', 'min': 1, 'max': 8}),
            'credits': forms.NumberInput(attrs={'class': 'form-control', 'min': 1, 'max': 10}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }

class ClassForm(forms.ModelForm):
    class Meta:
        model = Class
        fields = ['name', 'course', 'year', 'semester', 'section', 'academic_year', 'class_teacher']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'course': forms.Select(attrs={'class': 'form-select'}),
            'year': forms.NumberInput(attrs={'class': 'form-control', 'min': 1, 'max': 6}),
            'semester': forms.NumberInput(attrs={'class': 'form-control', 'min': 1, 'max': 8}),
            'section': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'A, B, C, etc.'}),
            'academic_year': forms.Select(attrs={'class': 'form-select'}),
            'class_teacher': forms.Select(attrs={'class': 'form-select'}),
        }

class StudentEnrollmentForm(forms.ModelForm):
    department = forms.ModelChoiceField(
        queryset=Department.objects.all(),
        required=False,
        empty_label="Select Department First",
        widget=forms.Select(attrs={'class': 'form-select', 'id': 'id_department'}),
        help_text="Select department to filter courses"
    )
    
    course = forms.ModelChoiceField(
        queryset=Course.objects.none(),
        required=False,
        empty_label="Select Course",
        widget=forms.Select(attrs={'class': 'form-select', 'id': 'id_course'}),
        help_text="Select course to filter classes"
    )
    
    class Meta:
        model = StudentEnrollment
        fields = ['student', 'class_enrolled', 'is_active']
        widgets = {
            'student': forms.Select(attrs={'class': 'form-select'}),
            'class_enrolled': forms.Select(attrs={'class': 'form-select'}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # If we have POST data, populate the department and course fields
        if 'department' in self.data:
            try:
                department_id = int(self.data.get('department'))
                self.fields['course'].queryset = Course.objects.filter(department_id=department_id)
            except (ValueError, TypeError):
                pass
        
        if 'course' in self.data:
            try:
                course_id = int(self.data.get('course'))
                self.fields['class_enrolled'].queryset = Class.objects.filter(course_id=course_id)
            except (ValueError, TypeError):
                pass
        elif self.instance.pk and self.instance.class_enrolled:
            # If editing existing enrollment, populate the fields
            class_enrolled = self.instance.class_enrolled
            course = class_enrolled.course
            department = course.department
            
            self.fields['department'].initial = department
            self.fields['course'].queryset = Course.objects.filter(department=department)
            self.fields['course'].initial = course
            self.fields['class_enrolled'].queryset = Class.objects.filter(course=course)

class TeacherSubjectAssignmentForm(forms.ModelForm):
    class Meta:
        model = TeacherSubjectAssignment
        fields = ['teacher', 'subject', 'class_assigned', 'academic_year']
        widgets = {
            'teacher': forms.Select(attrs={'class': 'form-select'}),
            'subject': forms.Select(attrs={'class': 'form-select'}),
            'class_assigned': forms.Select(attrs={'class': 'form-select'}),
            'academic_year': forms.Select(attrs={'class': 'form-select'}),
        }

class AssignmentForm(forms.ModelForm):
    class Meta:
        model = Assignment
        fields = ['title', 'description', 'assignment_type', 'subject', 'class_assigned', 
                 'due_date', 'max_marks', 'instructions', 'attachment', 'is_active']
        widgets = {
            'title': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'assignment_type': forms.Select(attrs={'class': 'form-select'}),
            'subject': forms.Select(attrs={'class': 'form-select'}),
            'class_assigned': forms.Select(attrs={'class': 'form-select'}),
            'due_date': forms.DateTimeInput(attrs={'class': 'form-control', 'type': 'datetime-local'}),
            'max_marks': forms.NumberInput(attrs={'class': 'form-control', 'min': 1}),
            'instructions': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'attachment': forms.FileInput(attrs={'class': 'form-control'}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }
    
    def __init__(self, *args, **kwargs):
        teacher = kwargs.pop('teacher', None)
        super().__init__(*args, **kwargs)
        
        if teacher:
            # Filter subjects and classes based on teacher's assignments
            teacher_assignments = TeacherSubjectAssignment.objects.filter(teacher=teacher)
            self.fields['subject'].queryset = Subject.objects.filter(
                id__in=teacher_assignments.values_list('subject_id', flat=True)
            )
            self.fields['class_assigned'].queryset = Class.objects.filter(
                id__in=teacher_assignments.values_list('class_assigned_id', flat=True)
            )

class AssignmentSubmissionForm(forms.ModelForm):
    class Meta:
        model = AssignmentSubmission
        fields = ['submission_text', 'attachment']
        widgets = {
            'submission_text': forms.Textarea(attrs={
                'class': 'form-control', 
                'rows': 6,
                'placeholder': 'Enter your submission text here...'
            }),
            'attachment': forms.FileInput(attrs={'class': 'form-control'}),
        }

class ClassFilterForm(forms.Form):
    course = forms.ModelChoiceField(
        queryset=Course.objects.all(),
        required=False,
        empty_label="All Courses",
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    year = forms.ChoiceField(
        choices=[('', 'All Years')] + [(i, f'Year {i}') for i in range(1, 7)],
        required=False,
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    semester = forms.ChoiceField(
        choices=[('', 'All Semesters')] + [(i, f'Semester {i}') for i in range(1, 9)],
        required=False,
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    academic_year = forms.ModelChoiceField(
        queryset=AcademicYear.objects.all(),
        required=False,
        empty_label="All Academic Years",
        widget=forms.Select(attrs={'class': 'form-select'})
    )