// Simple utility to manage selected course across all pages
export const getCourseSelection = () => {
    return localStorage.getItem('selectedCourseId');
};

export const setCourseSelection = (courseId) => {
    localStorage.setItem('selectedCourseId', courseId.toString());
};

export const clearCourseSelection = () => {
    localStorage.removeItem('selectedCourseId');
};

// Helper to build API URL with course selection
export const buildCourseUrl = (baseUrl) => {
    const selectedCourseId = getCourseSelection();
    if (selectedCourseId) {
        return `${baseUrl}?course_id=${selectedCourseId}`;
    }
    return baseUrl;
};
