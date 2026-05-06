const { Menu } = require('electron')

// Named constants
const MENU_LABEL_EDIT = 'Edit'
const MENU_LABEL_UNDO = 'Undo'
const MENU_LABEL_REDO = 'Redo'
const MENU_LABEL_CUT = 'Cut'
const MENU_LABEL_COPY = 'Copy'
const MENU_LABEL_PASTE = 'Paste'
const MENU_LABEL_SELECT_ALL = 'Select All'

const ACCELERATOR_UNDO = 'CmdOrCtrl+Z'
const ACCELERATOR_REDO = 'Shift+CmdOrCtrl+Z'
const ACCELERATOR_CUT = 'CmdOrCtrl+X'
const ACCELERATOR_COPY = 'CmdOrCtrl+C'
const ACCELERATOR_PASTE = 'CmdOrCtrl+V'
const ACCELERATOR_SELECT_ALL = 'CmdOrCtrl+A'

// History items grouped by function
const historyMenuItems = [
  {
    label: MENU_LABEL_UNDO,
    accelerator: ACCELERATOR_UNDO,
    role: 'undo'
  },
  {
    label: MENU_LABEL_REDO,
    accelerator: ACCELERATOR_REDO,
    role: 'redo'
  }
]

// Clipboard items grouped by function
const clipboardMenuItems = [
  {
    label: MENU_LABEL_CUT,
    accelerator: ACCELERATOR_CUT,
    role: 'cut'
  },
  {
    label: MENU_LABEL_COPY,
    accelerator: ACCELERATOR_COPY,
    role: 'copy'
  },
  {
    label: MENU_LABEL_PASTE,
    accelerator: ACCELERATOR_PASTE,
    role: 'paste'
  },
  {
    label: MENU_LABEL_SELECT_ALL,
    accelerator: ACCELERATOR_SELECT_ALL,
    role: 'selectAll'
  }
]

// Builds the full categorized menu template
function buildMenuTemplate() {
  const edit = {
    label: MENU_LABEL_EDIT,
    submenu: [
      ...historyMenuItems,
      { type: 'separator' },
      ...clipboardMenuItems
    ]
  }

  return [edit]
}

module.exports = () => Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenuTemplate()))
