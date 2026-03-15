// State
let vaultData = { groups: [] };
let expandedGroups = new Set();
const pastels = [
  '#fecaca', '#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fecdd3',
  '#fdba74', '#6ee7b7', '#7dd3fc', '#c4b5fd', '#f9a8d4', '#cbd5e1'
];
let selectedColor = pastels[0];
let editingGroupId = null;
let editingColor = null;

// DOM Elements

const showOverlayBtn = document.getElementById('showOverlayBtn');
const createEmptyGroupBtn = document.getElementById('createEmptyGroupBtn');
const newGroupOverlay = document.getElementById('newGroupOverlay');
const overlayModal = document.getElementById('overlayModal');
const cancelSaveBtn = document.getElementById('cancelSaveBtn');
const confirmSaveBtn = document.getElementById('confirmSaveBtn');
const groupNameInput = document.getElementById('groupNameInput');



const editColorOverlay = document.getElementById('editColorOverlay');
const editColorModal = document.getElementById('editColorModal');
const editColorSwatchesBox = document.getElementById('editColorSwatchesBox');
const cancelEditColorBtn = document.getElementById('cancelEditColorBtn');
const confirmEditColorBtn = document.getElementById('confirmEditColorBtn');
const groupsContainer = document.getElementById('groupsContainer');
const colorSwatchesBox = document.getElementById('colorSwatchesBox');
const themeToggle = document.getElementById('themeToggle');
const moonIcon = document.getElementById('moonIcon');
const sunIcon = document.getElementById('sunIcon');

// New Power Elements
const openFullViewBtn = document.getElementById('openFullViewBtn');
const settingsToggleBtn = document.getElementById('settingsToggleBtn');
const settingsMenu = document.getElementById('settingsMenu');
const openInNewWindowToggle = document.getElementById('openInNewWindowToggle');
const bulkExportBtn = document.getElementById('bulkExportBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtnTrigger = document.getElementById('importBtnTrigger');
const importInput = document.getElementById('importInput');
const searchInput = document.getElementById('searchInput');

let groupSortable = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadPreferences();
  await loadVaultData();
  renderGroups();
  renderColorSwatches();

  // Base Listeners
  showOverlayBtn.addEventListener('click', openOverlay);
  createEmptyGroupBtn.addEventListener('click', handleCreateEmptyGroup);
  cancelSaveBtn.addEventListener('click', closeOverlay);
  confirmSaveBtn.addEventListener('click', handleSaveSession);
  themeToggle.addEventListener('click', toggleTheme);
  
  newGroupOverlay.addEventListener('click', (e) => {
    if (e.target === newGroupOverlay) closeOverlay();
  });
  
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.export-btn')) {
      document.querySelectorAll('.export-dropdown.show').forEach(d => d.classList.remove('show'));
    }
  });

  editColorOverlay.addEventListener('click', (e) => {
    if (e.target === editColorOverlay) closeEditColorOverlay();
  });
  
  cancelEditColorBtn.addEventListener('click', closeEditColorOverlay);
  confirmEditColorBtn.addEventListener('click', handleSaveEditColor);

  // Power Listeners
  if (openFullViewBtn) {
    openFullViewBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    });
  }



  settingsToggleBtn.addEventListener('click', () => {
    settingsMenu.classList.toggle('hidden');
    if (!settingsMenu.classList.contains('hidden')) {
      settingsMenu.classList.remove('opacity-0');
      settingsMenu.classList.add('flex');
    }
  });

  // Close menus if clicking outside
  document.addEventListener('click', (e) => {
    if (!settingsToggleBtn.contains(e.target) && !settingsMenu.contains(e.target)) {
      settingsMenu.classList.add('hidden');
      settingsMenu.classList.remove('flex');
    }
  });



  openInNewWindowToggle.addEventListener('change', async (e) => {
    await chrome.storage.local.set({ openInNewWindow: e.target.checked    });
  });

  bulkExportBtn.addEventListener('click', () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `TabVault_Backup_${timestamp}.json`;
    downloadFile(JSON.stringify(vaultData, null, 2), filename, 'application/json');
    
    // Feedback
    bulkExportBtn.innerHTML = `<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Downloaded JSON`;
    setTimeout(() => {
      bulkExportBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg> Bulk Export Backup`;
    }, 2000);
  });

  exportBtn.addEventListener('click', exportJSON);
  importBtnTrigger.addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', importJSON);
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    renderGroups(query);
  });
});

async function loadPreferences() {
  const result = await chrome.storage.local.get(['theme', 'openInNewWindow']);
  
  const isDark = result.theme === 'dark' || (!result.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    moonIcon.classList.add('hidden');
    sunIcon.classList.remove('hidden');
  }

  if (result.openInNewWindow !== false) {
    openInNewWindowToggle.checked = true;
  } else {
    openInNewWindowToggle.checked = false;
  }
}

async function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  
  if (newTheme === 'dark') {
    moonIcon.classList.add('hidden');
    sunIcon.classList.remove('hidden');
  } else {
    moonIcon.classList.remove('hidden');
    sunIcon.classList.add('hidden');
  }
  await chrome.storage.local.set({ theme: newTheme });
}

function renderColorSwatches() {
  colorSwatchesBox.innerHTML = '';
  pastels.forEach(color => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `color-swatch shrink-0 transition-transform duration-200 hover:scale-110 ${color === selectedColor ? 'selected' : ''}`;
    btn.style.backgroundColor = color;
    btn.dataset.color = color;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectedColor = color;
      
      // Update visual selection without re-rendering the DOM elements
      colorSwatchesBox.querySelectorAll('.color-swatch').forEach(sw => {
        if (sw.dataset.color === color) {
          sw.classList.add('selected');
        } else {
          sw.classList.remove('selected');
        }
      });
    });
    colorSwatchesBox.appendChild(btn);
  });
}

function openEditColorOverlay(groupId, color) {
  editingGroupId = groupId;
  editingColor = color || pastels[0];
  renderEditColorSwatches();
  editColorOverlay.classList.remove('opacity-0', 'pointer-events-none');
  editColorModal.classList.remove('scale-95');
  editColorModal.classList.add('scale-100');
}

function closeEditColorOverlay() {
  editingGroupId = null;
  editColorOverlay.classList.add('opacity-0', 'pointer-events-none');
  editColorModal.classList.remove('scale-100');
  editColorModal.classList.add('scale-95');
}

async function handleSaveEditColor() {
  if (!editingGroupId) return;
  const group = vaultData.groups.find(g => g.id === editingGroupId);
  if (group) {
    group.color = editingColor;
    await saveVaultData();
    renderGroups(searchInput.value.toLowerCase());
  }
  closeEditColorOverlay();
}

function renderEditColorSwatches() {
  editColorSwatchesBox.innerHTML = '';
  pastels.forEach(color => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `color-swatch shrink-0 transition-transform duration-200 hover:scale-110 ${color === editingColor ? 'selected' : ''}`;
    btn.style.backgroundColor = color;
    btn.dataset.color = color;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      editingColor = color;
      
      editColorSwatchesBox.querySelectorAll('.color-swatch').forEach(sw => {
        if (sw.dataset.color === color) {
          sw.classList.add('selected');
        } else {
          sw.classList.remove('selected');
        }
      });
    });
    editColorSwatchesBox.appendChild(btn);
  });
}

function openOverlay() {
  groupNameInput.value = '';
  selectedColor = pastels[0];
  renderColorSwatches();
  newGroupOverlay.classList.remove('opacity-0', 'pointer-events-none');
  overlayModal.classList.remove('scale-95');
  overlayModal.classList.add('scale-100');
  groupNameInput.focus();
}

function closeOverlay() {
  newGroupOverlay.classList.add('opacity-0', 'pointer-events-none');
  overlayModal.classList.remove('scale-100');
  overlayModal.classList.add('scale-95');
}

async function loadVaultData() {
  const result = await chrome.storage.local.get(['vaultData']);
  vaultData = result.vaultData || { groups: [] };
}

async function saveVaultData() {
  await chrome.storage.local.set({ vaultData });
}

async function syncStateFromDOM() {
  const newGroups = [];
  document.querySelectorAll('.group-card').forEach(card => {
    const groupId = card.dataset.groupId;
    const groupName = card.querySelector('[data-type="group-name"]').textContent.trim() || 'Unnamed Session';
    const groupColor = card.dataset.color;
    
    // Preserve snoozed state and record locked state
    const originalGroup = vaultData.groups.find(g => g.id === groupId);
    const snoozedState = originalGroup ? originalGroup.snoozed : false;
    const readyState = originalGroup ? originalGroup.ready : false;
    const isLocked = card.querySelector('.lock-btn')?.classList.contains('locked-active') || false;

    const links = [];
    card.querySelectorAll('.link-item').forEach(li => {
      // Do not save if hidden by search
      links.push({
        url: li.dataset.url,
        title: li.querySelector('[data-type="link-title"]').textContent.trim() || li.dataset.url,
        favicon: li.dataset.favicon
      });
    });
    newGroups.push({ id: groupId, name: groupName, color: groupColor, links, snoozed: snoozedState, ready: readyState, locked: isLocked });
  });
  vaultData.groups = newGroups;
  await saveVaultData();
}

async function handleSaveSession() {
  try {
    const groupName = groupNameInput.value.trim() || `Session ${new Date().toLocaleDateString()}`;
    const tabs = await chrome.tabs.query({ currentWindow: true });
    
    if (!tabs || tabs.length === 0) {
      closeOverlay();
      return;
    }

    const newGroup = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      name: groupName,
      color: selectedColor,
      links: tabs.map(tab => ({
        url: tab.url,
        title: tab.title || tab.url,
        favicon: tab.favIconUrl || ''
      }))
    };

    let insertIndex = 0;
    for (let i = vaultData.groups.length - 1; i >= 0; i--) {
      if (vaultData.groups[i].locked) {
        insertIndex = i + 1;
        break;
      }
    }
    vaultData.groups.splice(insertIndex, 0, newGroup);
    
    await saveVaultData();
    renderGroups(searchInput.value.toLowerCase());
    closeOverlay();


  } catch (error) {
    console.error("Save error:", error);
  }
}

async function handleCreateEmptyGroup() {
    const newGroup = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      name: "Custom Group",
      color: pastels[Math.floor(Math.random() * pastels.length)],
      links: [],
      snoozed: false,
      ready: false
    };

  let insertIndex = 0;
  for (let i = vaultData.groups.length - 1; i >= 0; i--) {
    if (vaultData.groups[i].locked) {
      insertIndex = i + 1;
      break;
    }
  }
  vaultData.groups.splice(insertIndex, 0, newGroup);

  // Optional: Automatically expand empty groups so you can drag links into them immediately
  expandedGroups.add(newGroup.id);
  
  await saveVaultData();
  renderGroups(searchInput.value.toLowerCase());
}

// JSON Import & Export
function exportJSON() {
  settingsMenu.classList.add('hidden');
  const blob = new Blob([JSON.stringify(vaultData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tabvault_pro_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  settingsMenu.classList.add('hidden');
  
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const importedData = JSON.parse(event.target.result);
      if (importedData && importedData.groups && Array.isArray(importedData.groups)) {
        vaultData = importedData;
        await saveVaultData();
        renderGroups();
      } else {
        alert("Invalid JSON format for TabVault Pro.");
      }
    } catch (err) {
      alert("Error parsing JSON file.");
    }
    // reset input
    importInput.value = '';
  };
  reader.readAsText(file);
}

const DEFAULT_FAVICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEwIDEzczEuNSAxLjUgNCAxLjUgNC0xLjUgNC0xLjVNMTIgMjFhOSA5IDAgMSAwIDAtMTggOSA5IDAgMCAwIDAgMTh6Ii8+PC9zdmc+';

const EMPTY_SVG = `
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="50" y="40" width="100" height="120" rx="12" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M50 80H150" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="70" cy="60" r="6" fill="#ef4444"/>
    <circle cx="90" cy="60" r="6" fill="#f59e0b"/>
    <circle cx="110" cy="60" r="6" fill="#10b981"/>
    <path d="M80 110L100 130L120 110" stroke="#3b82f6" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M100 90V130" stroke="#3b82f6" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

function renderGroups(query = '') {
  if (vaultData.groups.length === 0) {
    groupsContainer.innerHTML = `
      <div class="empty-state">
        ${EMPTY_SVG}
        <h3 class="font-bold text-lg">Your Vault is Empty</h3>
        <p class="text-sm">Save your first session to organize your workspace and boost your focus.</p>
      </div>`;
    return;
  }

  groupsContainer.innerHTML = '';
  
  let hasMatches = false;

  vaultData.groups.forEach(group => {
    // Search Filtering
    const matchesGroup = group.name.toLowerCase().includes(query);
    const matchedLinks = group.links.filter(link => 
      link.title.toLowerCase().includes(query) || link.url.toLowerCase().includes(query)
    );
    
    if (query !== '' && !matchesGroup && matchedLinks.length === 0) {
      return; // Skip this card entirely
    }

    hasMatches = true;

    // Use matchedLinks for rendering if we are searching, otherwise all links
    const visibleLinks = (query !== '' && !matchesGroup) ? matchedLinks : group.links;
    // Always expand the group if we are searching and there's a match inside
    const isExpanded = query !== '' || expandedGroups.has(group.id);

    const card = document.createElement('div');
    let cardClasses = `group-card glass rounded-2xl p-4 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md flex flex-col gap-3`;
    if (group.locked) cardClasses += ` locked-card`;
    card.className = cardClasses;
    
    card.dataset.groupId = group.id;
    card.dataset.color = group.color;
    card.dataset.locked = group.locked ? 'true' : 'false';
    
    // Header row
    const header = document.createElement('div');
    header.className = 'flex items-center gap-2 cursor-pointer';
    
    header.onclick = (e) => {
      if (e.target.closest('[contenteditable]') || e.target.closest('button')) return;
      if (expandedGroups.has(group.id)) expandedGroups.delete(group.id);
      else expandedGroups.add(group.id);
      renderGroups(searchInput.value.toLowerCase());
    };

    const dot = document.createElement('div');
    dot.className = 'w-4 h-4 rounded-full shadow-sm cursor-pointer hover:scale-125 transition-transform shrink-0';
    dot.style.backgroundColor = group.color;
    dot.title = "Edit Color";
    dot.onclick = (e) => {
      e.stopPropagation();
      openEditColorOverlay(group.id, group.color);
    };
    
    const title = document.createElement('span');
    title.className = `font-bold flex-1 truncate text-sm inline-editor ${query !== '' && matchesGroup ? 'text-blue-500' : ''}`;
    title.contentEditable = "true";
    title.dataset.type = 'group-name';
    title.textContent = group.name;
    title.onblur = () => syncStateFromDOM();
    title.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } };
    

    const lockIcon = document.createElement('button');
    lockIcon.className = `lock-btn mr-1 ${group.locked ? 'locked-active' : ''}`;
    lockIcon.title = group.locked ? 'Unlock Group' : 'Lock Position';
    lockIcon.innerHTML = group.locked 
      ? `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>`
      : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>`;
    
    const dragGroupHandle = document.createElement('div');
    dragGroupHandle.className = `drag-group-handle`;
    dragGroupHandle.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path></svg>`;

    lockIcon.onclick = async (e) => {
      e.stopPropagation();
      const isLocked = !lockIcon.classList.contains('locked-active');
      if (isLocked) {
        lockIcon.classList.add('locked-active');
        lockIcon.title = 'Unlock Group';
        lockIcon.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>`;
        card.classList.add('locked-card');
        card.dataset.locked = 'true';
      } else {
        lockIcon.classList.remove('locked-active');
        lockIcon.title = 'Lock Position';
        lockIcon.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>`;
        card.classList.remove('locked-card');
        card.dataset.locked = 'false';
      }
      
      const targetGroup = vaultData.groups.find(g => g.id === group.id);
      if (targetGroup) targetGroup.locked = isLocked;
      await saveVaultData();
    };

    const count = document.createElement('span');
    count.className = 'text-xs text-muted font-medium ml-1';
    count.textContent = `${group.links.length} tabs`;

    const chevron = document.createElement('div');
    chevron.className = `icon-btn expand-btn ${isExpanded ? 'rotated' : ''}`;
    chevron.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;

    if(query === '') header.appendChild(dragGroupHandle);
    header.appendChild(dot);
    header.appendChild(title);
    header.appendChild(lockIcon);
    header.appendChild(count);
    if(query === '') header.appendChild(chevron); // only show chevron if not searching
    card.appendChild(header);
    
    // Favicon Stack (Visible only when collapsed)
    const stackWrap = document.createElement('div');
    stackWrap.className = `flex items-center mt-1 transition-opacity ${isExpanded ? 'hidden' : ''}`;
    
    group.links.slice(0, 5).forEach((link, idx) => {
      const item = document.createElement('div');
      item.className = 'favicon-item';
      item.style.zIndex = 5 - idx; 
      
      const img = document.createElement('img');
      img.src = link.favicon ? link.favicon : DEFAULT_FAVICON;
      img.onerror = () => { img.src = DEFAULT_FAVICON; };
      
      item.appendChild(img);
      stackWrap.appendChild(item);
    });
    
    if (group.links.length > 5) {
      const more = document.createElement('div');
      more.className = 'favicon-more';
      more.textContent = `+${group.links.length - 5}`;
      stackWrap.appendChild(more);
    }
    card.appendChild(stackWrap);

    // Expanded link list
    const linkList = document.createElement('ul');
    linkList.className = `link-list ${isExpanded ? '' : 'hidden'}`;
    linkList.id = `list-${group.id}`;

    visibleLinks.forEach(link => {
      const li = document.createElement('li');
      li.className = 'link-item';
      li.dataset.url = link.url;
      li.dataset.favicon = link.favicon;

      const handle = document.createElement('div');
      handle.className = 'drag-handle';
      handle.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path></svg>`;
      if(query !== '') handle.classList.add('opacity-0', 'pointer-events-none'); // Disable sorting while searching

      const fIcon = document.createElement('img');
      fIcon.className = 'favicon-img';
      fIcon.src = link.favicon || DEFAULT_FAVICON;
      fIcon.onerror = () => { fIcon.src = DEFAULT_FAVICON; };

      const isMatch = query !== '' && (link.title.toLowerCase().includes(query) || link.url.toLowerCase().includes(query));

      const lTitle = document.createElement('span');
      lTitle.className = `flex-1 text-xs truncate inline-editor ${isMatch ? 'text-blue-500 font-bold' : ''}`;
      lTitle.contentEditable = "true";
      lTitle.dataset.type = 'link-title';
      lTitle.textContent = link.title || link.url;
      lTitle.onblur = () => syncStateFromDOM();
      lTitle.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } };

      const deleteLinkBtn = document.createElement('button');
      deleteLinkBtn.className = 'delete-link-btn';
      deleteLinkBtn.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
      deleteLinkBtn.onclick = async (e) => {
        e.stopPropagation();
        
        // delete from model
        vaultData.groups.forEach(g => {
          if (g.id === group.id) {
            g.links = g.links.filter(l => l.url !== link.url);
          }
        });
        
        // Auto remove group if empty
        vaultData.groups = vaultData.groups.filter(g => g.links.length > 0);
        
        await saveVaultData();
        renderGroups(searchInput.value.toLowerCase());
      };

      li.appendChild(handle);
      li.appendChild(fIcon);
      li.appendChild(lTitle);
      li.appendChild(deleteLinkBtn);
      linkList.appendChild(li);
    });

    card.appendChild(linkList);

    // Initialize SortableJS only when fully normal (no search filter)
    if (isExpanded && query === '' && typeof Sortable !== 'undefined') {
      Sortable.create(linkList, {
        group: 'shared',
        animation: 150,
        handle: '.drag-handle',
        onEnd: () => {
          syncStateFromDOM().then(() => {
            const currentCount = linkList.querySelectorAll('.link-item').length;
            if (currentCount === 0) {
              vaultData.groups = vaultData.groups.filter(g => g.id !== group.id);
              saveVaultData().then(() => renderGroups(searchInput.value.toLowerCase()));
            } else {
              renderGroups(searchInput.value.toLowerCase()); 
            }
          });
        }
      });
    }

    // Actions row
    const actions = document.createElement('div');
    actions.className = 'flex justify-between items-center mt-auto border-t border-theme pt-3';
    
    const actionsLeft = document.createElement('div');
    actionsLeft.className = 'flex items-center gap-1';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn p-1.5 rounded-lg text-red-500 hover:bg-red-500 transition-colors duration-200';
    deleteBtn.title = 'Delete Group';
    deleteBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
    deleteBtn.onclick = async (e) => {
      e.stopPropagation();
      vaultData.groups = vaultData.groups.filter(g => g.id !== group.id);
      await saveVaultData();
      renderGroups(searchInput.value.toLowerCase());
    };
    
    // Export Data Portability
    const exportWrap = document.createElement('div');
    exportWrap.className = 'export-btn';
    
    const exportBtn = document.createElement('button');
    exportBtn.className = 'icon-btn p-1.5 rounded-lg opacity-75 hover:opacity-100 hover:bg-theme-secondary transition-colors duration-200';
    exportBtn.title = 'Copy Session Data';
    exportBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>`;
    
    const exportDropdown = createExportDropdown(exportBtn, group.name, group.links);
    
    exportBtn.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll('.export-dropdown.show').forEach(d => { if (d !== exportDropdown) d.classList.remove('show'); });
      exportDropdown.classList.toggle('show');
    };
    
    exportWrap.appendChild(exportBtn);
    exportWrap.appendChild(exportDropdown);
    
    actionsLeft.appendChild(deleteBtn);
    actionsLeft.appendChild(exportWrap);

    const actionsRight = document.createElement('div');
    actionsRight.className = 'flex gap-2';
    
    const openBtn = document.createElement('button');
    openBtn.className = 'px-3 py-1.5 rounded-lg font-medium text-xs transition-colors duration-200';
    openBtn.textContent = 'Open All';
    openBtn.style.background = 'var(--btn-secondary)';
    openBtn.onmouseover = () => { openBtn.style.background = 'var(--btn-secondary-hover)'; };
    openBtn.onmouseout = () => { openBtn.style.background = 'var(--btn-secondary)'; };
    
    openBtn.onclick = async (e) => {
      e.stopPropagation();
      openGroup(group.links);
      if (group.ready) {
        const targetGroup = vaultData.groups.find(g => g.id === group.id);
        if (targetGroup) targetGroup.ready = false;
        await saveVaultData();
        renderGroups(searchInput.value.toLowerCase());
      }
    };
    
    actionsRight.appendChild(openBtn);
    
    actions.appendChild(actionsLeft);
    actions.appendChild(actionsRight);
    card.appendChild(actions);
    
    groupsContainer.appendChild(card);
  });

  if (!hasMatches && query !== '') {
    groupsContainer.innerHTML = '<div class="text-center text-sm opacity-75 p-4 mt-2 font-medium text-red-500">No results found for your search.</div>';
  }

  // Initialize group dragging with Boutique Experience
  if (query === '' && typeof Sortable !== 'undefined') {
    if (groupSortable) {
      groupSortable.destroy();
      groupSortable = null;
    }

    groupSortable = Sortable.create(groupsContainer, {
      animation: 200,
      handle: '.drag-group-handle',
      
      // Smooth Scroll Engine
      scroll: true,
      bubbleScroll: true,
      scrollSensitivity: 100,
      scrollSpeed: 15,
      
      // Bypassing Native Junk
      forceFallback: true,
      fallbackTolerance: 3,
      
      // Accurate Placement & Feedback
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      
      onEnd: () => {
        syncStateFromDOM();
      }
    });
  }
}

async function openGroup(links) {
  const { openInNewWindow } = await chrome.storage.local.get(['openInNewWindow']);
  const shouldOpenInNewWindow = openInNewWindow !== false;

  if (shouldOpenInNewWindow) {
    chrome.windows.create({ url: links.map(l => l.url) });
  } else {
    links.forEach(link => {
      chrome.tabs.create({ url: link.url, active: false });
    });
  }
}



// --- Data Portability Export Logic ---

function generateExportString(groupName, links, format) {
  if (format === 'markdown') {
    let str = `# ${groupName}\n\n`;
    links.forEach(l => { str += `* [${l.title || l.url}](${l.url})\n`; });
    return str;
  } else if (format === 'csv') {
    let str = `"Group","Title","URL","Date Saved"\n`;
    const dateStr = new Date().toISOString().split('T')[0];
    links.forEach(l => {
      // Escape internal double quotes by doubling them ("") for CSV safety
      const safeTitle = (l.title || l.url).replace(/"/g, '""');
      const safeUrl = l.url.replace(/"/g, '""');
      str += `"${groupName}","${safeTitle}","${safeUrl}","${dateStr}"\n`;
    });
    return str;
  } else {
    let str = `${groupName}\n\n`;
    links.forEach(l => { str += `- ${l.title || l.url}: ${l.url}\n`; });
    return str;
  }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function createExportDropdown(buttonNode, groupName, links) {
  const dropdown = document.createElement('div');
  dropdown.className = 'export-dropdown';
  
  const mdBtn = document.createElement('button');
  mdBtn.className = 'export-dropdown-item';
  mdBtn.innerHTML = `<svg class="w-4 h-4 opacity-75 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg> <span>Markdown</span>`;
  
  const txtBtn = document.createElement('button');
  txtBtn.className = 'export-dropdown-item';
  txtBtn.innerHTML = `<svg class="w-4 h-4 opacity-75 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"></path></svg> <span>Plain Text</span>`;

  const csvBtn = document.createElement('button');
  csvBtn.className = 'export-dropdown-item';
  csvBtn.innerHTML = `<svg class="w-4 h-4 opacity-75 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> <span>Download CSV</span>`;

  const showFeedback = () => {
    dropdown.classList.remove('show');
    const originalHTML = buttonNode.innerHTML;
    buttonNode.innerHTML = `<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
    buttonNode.classList.add('text-green-500');
    buttonNode.title = 'Exported!';
    setTimeout(() => {
      buttonNode.innerHTML = originalHTML;
      buttonNode.classList.remove('text-green-500');
      buttonNode.title = 'Copy/Download Session Data';
    }, 2000);
  };

  const handleCopy = (format) => {
    const str = generateExportString(groupName, links, format);
    navigator.clipboard.writeText(str).then(showFeedback);
  };

  const handleDownloadCSV = () => {
    const str = generateExportString(groupName, links, 'csv');
    const safeName = groupName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadFile(str, `${safeName}_export.csv`, 'text/csv');
    showFeedback();
  };

  mdBtn.onclick = (e) => { e.stopPropagation(); handleCopy('markdown'); };
  txtBtn.onclick = (e) => { e.stopPropagation(); handleCopy('text'); };
  csvBtn.onclick = (e) => { e.stopPropagation(); handleDownloadCSV(); };

  dropdown.appendChild(mdBtn);
  dropdown.appendChild(txtBtn);
  dropdown.appendChild(csvBtn);
  return dropdown;
}
