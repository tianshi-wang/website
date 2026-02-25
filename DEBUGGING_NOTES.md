# Debugging Notes & Lessons Learned

## Session: AI Summary Feature Fixes (2024-02-24)

### Issue 1: AI Summary Generation Failing
**Problem:** AI summaries were not being generated after form submission.

**Root Cause:** The Grok API model name was incorrect.
- Used: `grok-beta` (doesn't exist)
- Should use: `grok-3` or other valid models

**How to Debug:**
1. Check backend logs for API errors
2. Test the API service independently with a test script
3. Call the `/v1/models` endpoint to list available models:
   ```bash
   curl https://api.x.ai/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

**Solution:** Updated `backend/services/aiService.js` to use `grok-3` model.

**Available Grok Models (as of Feb 2024):**
- `grok-3` - General purpose (recommended for summaries)
- `grok-3-mini` - Faster, lighter version
- `grok-4-fast-non-reasoning` - Fast without reasoning
- `grok-4-fast-reasoning` - Fast with reasoning
- `grok-2-vision-1212` - Vision tasks

**Key Learning:** Always verify API model names with the provider's documentation or API endpoint before deployment.

---

### Issue 2: CSS Inheritance Problem
**Problem:** AI badge showed a background box despite CSS explicitly removing it.

**Root Cause:** The element had multiple CSS classes: `className="tile-badge tile-badge-ai"`
- `.tile-badge` defined background, padding, border-radius
- `.tile-badge-ai` tried to override but didn't explicitly set all inherited properties

**How CSS Inheritance Works:**
```css
.tile-badge {
  background: var(--accent);  /* This gets inherited! */
  padding: 4px 8px;          /* This too! */
  border-radius: 6px;        /* And this! */
}

.tile-badge-ai {
  color: white;  /* Only this applies if both classes are used */
}
```

**Solution:** Remove the parent class entirely:
```jsx
// Before (inherits .tile-badge styles)
<span className="tile-badge tile-badge-ai">✨ AI</span>

// After (clean, no inheritance)
<span className="tile-badge-ai">✨ AI</span>
```

**Key Learning:** When debugging CSS issues:
1. Check ALL classes applied to the element
2. Inspect computed styles in DevTools
3. Understand CSS specificity and inheritance
4. If you want completely different styling, don't share parent classes

---

### Issue 3: React Rendering `0` in JSX
**Problem:** Non-AI tiles displayed a literal `0` on the page.

**Root Cause:** In React, `0` is a falsy value BUT it still renders as text.

**How React Conditional Rendering Works:**
```jsx
// ❌ WRONG - renders "0" when value is 0
{value && <Component />}

// ✅ CORRECT - converts to proper boolean
{!!value && <Component />}
{Boolean(value) && <Component />}
{value === 1 && <Component />}
{value > 0 && <Component />}
```

**Why This Happens:**
- `0 && <Component>` evaluates to `0` (not `false`)
- React renders `0` as text
- Other falsy values (`null`, `undefined`, `false`) don't render

**Solution:**
```jsx
// Before
{q.ai_summary_enabled && <span>✨ AI</span>}

// After
{!!q.ai_summary_enabled && <span>✨ AI</span>}
```

**Key Learning:** Always coerce numbers to booleans in React conditional rendering using `!!` or explicit comparison.

---

### Issue 4: Browser Caching During Development
**Problem:** CSS changes didn't appear in browser despite updating the file.

**Root Cause:** Browser cached the old CSS file.

**Solutions:**
1. **Hard Refresh:**
   - Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

2. **DevTools Method:**
   - Open DevTools (F12)
   - Right-click refresh button
   - Select "Empty Cache and Hard Reload"

3. **Disable Caching in DevTools:**
   - Open DevTools (F12)
   - Go to Network tab
   - Check "Disable cache" (only works while DevTools is open)

**Key Learning:** Always try a hard refresh before assuming code changes aren't working. CSS and JS files are heavily cached by browsers.

---

## Best Practices Summary

### 1. API Integration
- ✅ Always test API endpoints with a separate test script first
- ✅ Verify model names and API versions with provider documentation
- ✅ Add comprehensive error logging to see full API responses
- ✅ Handle API errors gracefully without breaking the main flow

### 2. CSS Debugging
- ✅ Check all classes applied to an element (not just the one you're editing)
- ✅ Use browser DevTools to inspect computed styles
- ✅ Understand CSS specificity and inheritance chains
- ✅ When in doubt, use fewer classes with more explicit styles

### 3. React Patterns
- ✅ Always coerce numbers to booleans in conditional rendering: `!!value`
- ✅ Be aware that `0` renders as text in React
- ✅ Test edge cases (null, undefined, 0, empty string)

### 4. Development Workflow
- ✅ Hard refresh when CSS/JS changes don't appear
- ✅ Check that dev servers are running and auto-reloading
- ✅ Test changes in incognito mode to avoid cache issues
- ✅ Document debugging steps for future reference

---

## Files Modified in This Session

### Backend
- `backend/services/aiService.js` - Fixed Grok API model name

### Frontend
- `frontend/src/pages/Feed.jsx` - Fixed AI badge rendering and `0` display
- `frontend/src/pages/Questionnaire.jsx` - Added AI summary notice
- `frontend/src/pages/Chat.jsx` - Added AI summary notice
- `frontend/src/index.css` - Fixed CSS inheritance, added notice banner styles

### Documentation
- `AI_SUMMARY_FEATURE.md` - Updated with correct model name
- `DEBUGGING_NOTES.md` - This file
