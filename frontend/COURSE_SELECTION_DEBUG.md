# Course Selection Not Persisting - Debugging Steps

## Issue
User reports that selecting an old course in the Learning Path/Classroom page doesn't persist - when navigating or refreshing, it reverts to the newest course.

## Changes Made
1. ✅ `switchCourse()` - Saves `selectedCourseId` to localStorage
2. ✅ `fetchActiveCourse()` - Checks localStorage and uses saved course ID  
3. ✅ Backend supports `?course_id=X` parameter

## Possible Issues

### 1. **Browser Cache**
The frontend might be serving cached JavaScript files.

**Solution**: Hard refresh the page
- Windows: `Ctrl + Shift + R` or `Ctrl + F5`
- Or clear browser cache completely

### 2. **LocalStorage Not Clearing**
Old data might be interfering.

**Solution**: Open browser developer tools (F12)
```javascript
// In Console tab, run:
localStorage.clear()
// Then refresh
```

### 3. **React Dev Server Not Hot-Reloading**
The `npm run dev` has been running for 13+ hours. Changes might not be reflected.

**Solution**: Restart the frontend dev server
```bash
# Stop npm (Ctrl+C in the terminal)
# Then restart:
npm run dev
```

### 4. **Check What's Actually Saved**
**Solution**: Open Developer Tools > Application > LocalStorage
- Look for `selectedCourseId`
- Does it update when you switch courses?

## Testing Steps

1. **Open Browser DevTools** (F12)
2. **Go to Console tab**
3. **Check localStorage**:
   ```javascript
   localStorage.getItem('selectedCourseId')
   ```
4. **Navigate to Learning Path/Classroom**
5. **Switch to an old course using dropdown**
6. **Check localStorage again** - should show new course ID
7. **Refresh page** - should load the selected course

## Quick Fix Command

**Restart frontend server:**
```powershell
# In the frontend terminal (press Ctrl+C first)
npm run dev
```

Then test the course selection again with a hard refresh (Ctrl+Shift+R).
