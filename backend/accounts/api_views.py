from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.db import models
from django.utils import timezone as django_timezone
from .models import TeacherProfile
from academic.models import TeacherSubjectAssignment, Assignment, StudentEnrollment, AssignmentSubmission
from attendance.models import AttendanceSession, AttendanceRecord

@login_required
@require_http_methods(["GET"])
def teacher_dashboard_stats(request):
    """API endpoint for real-time teacher dashboard statistics"""
    
    if request.user.user_type != 'teacher':
        return JsonResponse({'error': 'Access denied'}, status=403)
    
    try:
        teacher_profile = request.user.teacher_profile
        teacher_assignments = TeacherSubjectAssignment.objects.filter(
            teacher=teacher_profile
        ).select_related('subject', 'class_assigned')
        
        today = django_timezone.now()
        today_date = today.date()
        
        # Calculate real-time statistics
        stats = {
            'last_updated': today.isoformat(),
            'assignment_stats': [],
            'passing_stats': [],
            'attendance_stats': [],
            'syllabus_progress': [],
            'summary': {
                'total_students': 0,
                'total_subjects': teacher_assignments.count(),
                'pending_assignments': Assignment.objects.filter(
                    teacher=teacher_profile,
                    is_active=True
                ).count(),
                'total_assignments_created': Assignment.objects.filter(
                    teacher=teacher_profile
                ).count(),
                'total_submissions_received': AssignmentSubmission.objects.filter(
                    assignment__teacher=teacher_profile
                ).count(),
            }
        }
        
        # Calculate detailed statistics for each class
        for assignment in teacher_assignments:
            class_obj = assignment.class_assigned
            
            # Count students
            total_students_in_class = StudentEnrollment.objects.filter(
                class_enrolled=class_obj,
                is_active=True
            ).count()
            stats['summary']['total_students'] += total_students_in_class
            
            # Assignment submissions
            class_assignments = Assignment.objects.filter(
                teacher=teacher_profile,
                class_assigned=class_obj,
                is_active=True
            )
            
            total_submissions = 0
            total_possible_submissions = 0
            
            for assign in class_assignments:
                submissions_count = assign.assignmentsubmission_set.count()
                total_submissions += submissions_count
                total_possible_submissions += total_students_in_class
            
            # If no assignments exist, create sample data
            if class_assignments.count() == 0:
                total_possible_submissions = total_students_in_class * 2
                total_submissions = 0
            
            submission_rate = (total_submissions / total_possible_submissions * 100) if total_possible_submissions > 0 else 0
            
            # Create shorter class name
            subject_short = assignment.subject.name[:8] + "..." if len(assignment.subject.name) > 8 else assignment.subject.name
            class_display_name = f"{subject_short}-{class_obj.section}"
            
            stats['assignment_stats'].append({
                'class_name': class_display_name,
                'total_assignments': class_assignments.count(),
                'total_submissions': total_submissions,
                'not_submitted': total_possible_submissions - total_submissions,
                'submission_rate': round(submission_rate, 1),
                'total_students': total_students_in_class
            })
            
            # Passing rate
            graded_submissions = AssignmentSubmission.objects.filter(
                assignment__teacher=teacher_profile,
                assignment__class_assigned=class_obj,
                marks_obtained__isnull=False
            )
            
            total_graded = graded_submissions.count()
            passing_submissions = graded_submissions.filter(
                marks_obtained__gte=models.F('assignment__max_marks') * 0.6
            ).count()
            
            failing_submissions = total_graded - passing_submissions
            passing_rate = (passing_submissions / total_graded * 100) if total_graded > 0 else 0
            
            subject_short = assignment.subject.name[:8] + "..." if len(assignment.subject.name) > 8 else assignment.subject.name
            class_display_name = f"{subject_short}-{class_obj.section}"
            
            stats['passing_stats'].append({
                'class_name': class_display_name,
                'total_graded': total_graded,
                'passed': passing_submissions,
                'failed': failing_submissions,
                'passing_rate': round(passing_rate, 1)
            })
            
            # Attendance
            sessions = AttendanceSession.objects.filter(
                teacher_assignment=assignment
            )
            
            total_records = AttendanceRecord.objects.filter(
                session__in=sessions
            ).count()
            
            present_records = AttendanceRecord.objects.filter(
                session__in=sessions,
                status__in=['present', 'late']
            ).count()
            
            attendance_rate = (present_records / total_records * 100) if total_records > 0 else 0
            
            subject_short = assignment.subject.name[:8] + "..." if len(assignment.subject.name) > 8 else assignment.subject.name
            class_display_name = f"{subject_short}-{class_obj.section}"
            
            stats['attendance_stats'].append({
                'class_name': class_display_name,
                'total_sessions': sessions.count(),
                'total_records': total_records,
                'present_records': present_records,
                'attendance_rate': round(attendance_rate, 1)
            })
            
            # Syllabus progress
            total_sessions = sessions.count()
            completed_sessions = sessions.filter(
                is_completed=True,
                topic_covered__isnull=False
            ).exclude(topic_covered='').count()
            
            progress_percentage = (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0
            
            stats['syllabus_progress'].append({
                'subject_name': assignment.subject.name,
                'class_name': class_obj.section,
                'total_sessions': total_sessions,
                'completed_sessions': completed_sessions,
                'progress_percentage': round(progress_percentage, 1)
            })
        
        # Calculate average grade
        avg_grade = AssignmentSubmission.objects.filter(
            assignment__teacher=teacher_profile,
            marks_obtained__isnull=False
        ).aggregate(
            avg_marks=models.Avg('marks_obtained')
        )['avg_marks'] or 0
        
        stats['summary']['avg_grade'] = round(avg_grade, 1)
        
        return JsonResponse(stats)
        
    except TeacherProfile.DoesNotExist:
        return JsonResponse({'error': 'Teacher profile not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)