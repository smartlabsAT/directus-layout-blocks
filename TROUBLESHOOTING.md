# Troubleshooting Guide

## 🔍 Quick Diagnostics

Before diving into specific issues, run this quick diagnostic:

```javascript
// Open browser console (F12) and run:
console.log('[Layout Blocks] Debug Info:', {
  directusVersion: window.directus?.version,
  extensionLoaded: !!document.querySelector('.layout-blocks-interface'),
  debugEnabled: localStorage.getItem('LAYOUT_BLOCKS_DEBUG') === 'true'
});
```

To enable debug mode:
```javascript
localStorage.setItem('LAYOUT_BLOCKS_DEBUG', 'true');
location.reload();
```

---

## 🚨 Common Issues

### 1️⃣ Extension Not Appearing

<details>
<summary><b>The "Layout Blocks" interface option doesn't appear when configuring an M2A field</b></summary>

#### Symptoms
- Interface dropdown doesn't show "Layout Blocks"
- Only see default M2A interfaces

#### Causes & Solutions

**1. Extension not installed properly**
```bash
# Check if extension exists
ls -la /path/to/directus/extensions/interfaces/

# Should see layout-blocks directory
```

**2. Directus not restarted**
```bash
# Restart Directus after installing
docker-compose restart directus
# or
pm2 restart directus
```

**3. Extension build failed**
```bash
# Rebuild the extension
cd layout-blocks
npm run build

# Check for build errors
```

**4. Wrong Directus version**
- Requires Directus 10.x or higher
- Check version: Settings → About

</details>

### 2️⃣ No Collections in Block Creator

<details>
<summary><b>When clicking "Add Block", no collections appear in the dropdown</b></summary>

#### Symptoms
- Empty collection dropdown
- "No collections available" message
- Collections list shows placeholders

#### Debug Steps

1. **Check browser console for errors**
```
[Layout Blocks] Allowed collections: []
[Layout Blocks] No collections detected
```

2. **Verify M2A configuration**
```javascript
// In console, check field configuration
const field = await api.get('/fields/your_collection/your_field');
console.log('Field config:', field.data.data);
```

3. **Check junction table structure**
```sql
-- Your junction table should have:
DESCRIBE your_junction_table;
-- Expected columns:
-- id, parent_id, collection, item, area, sort
```

#### Solutions

**1. Manually configure collections**
- Edit the M2A field
- In interface options, add allowed collections manually

**2. Recreate the M2A field**
- Delete the current field
- Create new M2A field
- Select collections during creation
- Then choose Layout Blocks interface

**3. Check permissions**
```javascript
// Verify you have read access to collections
const permissions = await api.get('/permissions/me');
console.log('My permissions:', permissions.data.data);
```

</details>

### 3️⃣ Blocks Not Saving

<details>
<summary><b>Changes to blocks aren't persisted after saving</b></summary>

#### Symptoms
- Blocks revert after save
- Sort order not preserved
- New blocks disappear

#### Current Limitation (v0.0.1-alpha)
> ⚠️ The current alpha version uses direct API calls instead of Directus' native state management. This will be fixed in v0.2.0.

#### Temporary Workarounds

1. **Ensure parent item is saved first**
   - Create/save the parent item
   - Then add blocks

2. **Check for API errors**
```javascript
// Open Network tab in DevTools
// Look for failed PATCH/POST requests
// Check response for error details
```

3. **Verify junction table permissions**
   - Need CREATE permission on junction table
   - Need UPDATE permission for sorting

</details>

### 4️⃣ Drag & Drop Not Working

<details>
<summary><b>Cannot drag blocks between areas or reorder them</b></summary>

#### Symptoms
- Blocks don't respond to drag
- Can't drop in target areas
- Visual feedback missing

#### Solutions

**1. Check if drag is enabled**
```javascript
// In interface options
enableDragDrop: true // Should be true
```

**2. Browser compatibility**
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: May have issues with drag preview

**3. Check area constraints**
```javascript
// Areas may have restrictions
{
  maxItems: 5,  // Area full?
  allowedTypes: ['content_text'], // Block type allowed?
  locked: true  // Area locked?
}
```

**4. Debug drag events**
```javascript
// Enable debug mode and watch console during drag
localStorage.setItem('LAYOUT_BLOCKS_DEBUG', 'true');
```

</details>

### 5️⃣ Performance Issues

<details>
<summary><b>Interface is slow with many blocks</b></summary>

#### Symptoms
- Laggy interface
- Slow block expansion
- Browser freezing

#### Solutions

**1. Use compact mode**
```javascript
// In interface options
compactMode: true
```

**2. Enable accordion mode**
```javascript
// Only one block expanded at a time
accordionMode: true
```

**3. Limit visible blocks**
- Consider pagination
- Use list view instead of grid
- Reduce max blocks per area

**4. Check browser performance**
```javascript
// Profile in DevTools
performance.mark('blocks-start');
// ... operations
performance.mark('blocks-end');
performance.measure('blocks', 'blocks-start', 'blocks-end');
```

</details>

---

## 🔧 Advanced Debugging

### Enable Verbose Logging

```typescript
// In utils/logger.ts, set:
const DEBUG = true;

// Or via console:
window.LAYOUT_BLOCKS_DEBUG = true;
```

### Inspect Component State

```javascript
// With Vue DevTools installed
// 1. Open Vue DevTools
// 2. Find LayoutBlocksInterface component
// 3. Inspect:
//    - blocks (current block data)
//    - areas (area configuration)
//    - junctionInfo (M2A structure)
```

### API Response Inspection

```javascript
// Intercept API calls
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  console.log('API Call:', args);
  const response = await originalFetch(...args);
  console.log('API Response:', response);
  return response;
};
```

### Check Junction Structure

```javascript
// Verify junction detection
async function checkJunction() {
  const api = useApi();
  
  // Get relation info
  const relations = await api.get('/relations', {
    params: {
      filter: {
        collection: { _eq: 'your_collection' },
        field: { _eq: 'your_field' }
      }
    }
  });
  
  console.log('Relations:', relations.data.data);
  
  // Get junction fields
  const junction = relations.data.data[0]?.meta?.junction_field;
  const fields = await api.get(`/fields/${junction}`);
  
  console.log('Junction fields:', fields.data.data);
}
```

---

## 🏥 Recovery Procedures

### Reset Extension State

```javascript
// Clear all extension data
localStorage.removeItem('LAYOUT_BLOCKS_DEBUG');
localStorage.removeItem('LAYOUT_BLOCKS_STATE');

// Reload
location.reload();
```

### Recreate M2A Field

1. **Export existing data**
```javascript
// Save current blocks
const blocks = await api.get('/items/junction_table');
console.log('Backup:', JSON.stringify(blocks.data.data));
```

2. **Delete field**
- Navigate to Settings → Data Model
- Delete the M2A field

3. **Recreate properly**
- Create new M2A field
- Configure collections
- Select Layout Blocks interface
- Import backed up data

### Manual Block Cleanup

```javascript
// Remove orphaned blocks
async function cleanupOrphans() {
  const api = useApi();
  
  // Get all junction records
  const junctions = await api.get('/items/junction_table');
  
  // Find orphans (no parent reference)
  const orphans = junctions.data.data.filter(j => !j.parent_id);
  
  // Delete orphans
  for (const orphan of orphans) {
    await api.delete(`/items/junction_table/${orphan.id}`);
  }
}
```

---

## 📋 Diagnostic Checklist

### Initial Setup
- [ ] Directus version 10.x or higher
- [ ] Extension installed in correct directory
- [ ] Directus restarted after installation
- [ ] M2A field created properly
- [ ] Collections selected in M2A configuration
- [ ] Layout Blocks interface selected

### Permissions
- [ ] READ permission on content collections
- [ ] CREATE permission on junction table
- [ ] UPDATE permission on junction table
- [ ] DELETE permission on junction table (if needed)

### Configuration
- [ ] Area field exists in junction table
- [ ] Sort field exists in junction table
- [ ] Collections properly configured
- [ ] Interface options set correctly

### Browser
- [ ] Using supported browser (Chrome, Edge, Firefox)
- [ ] JavaScript console checked for errors
- [ ] Network tab checked for failed requests
- [ ] Vue DevTools installed (recommended)

---

## 🆘 Getting Help

### Before Asking for Help

1. **Check this guide thoroughly**
2. **Enable debug mode and collect logs**
3. **Try the diagnostic steps**
4. **Search existing issues**

### Information to Provide

```markdown
**Environment:**
- Directus Version: 10.x.x
- Extension Version: 0.0.1-alpha
- Browser: Chrome 120
- OS: macOS 14

**Issue Description:**
[Clear description of the problem]

**Steps to Reproduce:**
1. [First step]
2. [Second step]
3. [...]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Console Output:**
```
[Paste any errors or debug output]
```

**Network Errors:**
[Screenshot of failed network requests]

**Additional Context:**
[Any other relevant information]
```

### Where to Get Help

1. **GitHub Issues**: [Report bugs](https://github.com/smartlabsAT/directus-layout-blocks/issues)
2. **Directus Discord**: #extensions channel
3. **Stack Overflow**: Tag with `directus` and `directus-extensions`

---

## 🚀 Known Issues (v0.0.1-alpha)

### Current Limitations

1. **State Management**: Uses direct API calls instead of native Directus state
2. **Performance**: Not optimized for 100+ blocks
3. **Browser Support**: Safari may have drag & drop issues
4. **Save Integration**: No native save/revert support yet

### Planned Fixes

- **v0.2.0**: Native state management integration
- **v0.3.0**: Performance optimizations
- **v0.4.0**: Enhanced browser compatibility
- **v1.0.0**: Full production-ready release

See [ROADMAP.md](./ROADMAP.md) for detailed plans.

---

Made with ❤️ for the Directus community