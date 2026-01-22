@courses_bp.route('/enrollments/active', methods=['GET'])
@jwt_required()
def get_active_enrollments():
    """Get all active course enrollments for the current user"""
    current_student_id = get_jwt_identity()
    
    enrollments = Enrollment.query.filter_by(
        student_id=current_student_id,
        status='active'
    ).order_by(Enrollment.enrolled_at.desc()).all()
    
    result = []
    for enrollment in enrollments:
        course = Course.query.get(enrollment.course_id)
        if course:
            result.append({
                'course_id': course.course_id,
                'title': course.title,
                'category': course.category,
                'completion_percentage': enrollment.completion_percentage or 0,
                'enrolled_at': enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None
            })
    
    return jsonify(result)
