from django.db import models
from django.utils import timezone
from accounts.models import StudentProfile, TeacherProfile
from academic.models import Subject, Class, TeacherSubjectAssignment

class AttendanceSession(models.Model):
    """Represents a single class session for attendance marking"""
    teacher_assignment = models.ForeignKey(TeacherSubjectAssignment, on_delete=models.CASCADE)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    topic_covered = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['teacher_assignment', 'date', 'start_time']
    
    def __str__(self):
        return f"{self.teacher_assignment.subject.name} - {self.teacher_assignment.class_assigned} - {self.date}"

class AttendanceRecord(models.Model):
    ATTENDANCE_CHOICES = (
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
        ('excused', 'Excused'),
    )
    
    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=ATTENDANCE_CHOICES)
    remarks = models.TextField(blank=True)
    marked_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['session', 'student']
    
    def __str__(self):
        return f"{self.student.user.get_full_name()} - {self.session} - {self.status}"

class AttendanceSummary(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    class_enrolled = models.ForeignKey(Class, on_delete=models.CASCADE)
    month = models.PositiveIntegerField()
    year = models.PositiveIntegerField()
    total_sessions = models.PositiveIntegerField(default=0)
    sessions_attended = models.PositiveIntegerField(default=0)
    sessions_late = models.PositiveIntegerField(default=0)
    sessions_excused = models.PositiveIntegerField(default=0)
    attendance_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    class Meta:
        unique_together = ['student', 'subject', 'class_enrolled', 'month', 'year']
    
    def __str__(self):
        return f"{self.student.user.get_full_name()} - {self.subject.name} - {self.month}/{self.year}"
    
    def calculate_percentage(self):
        if self.total_sessions > 0:
            # Count present, late, and excused as attended
            attended = self.sessions_attended + self.sessions_late + self.sessions_excused
            self.attendance_percentage = (attended / self.total_sessions) * 100
        else:
            self.attendance_percentage = 0.00
        return self.attendance_percentage