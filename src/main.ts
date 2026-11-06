import { UIManager } from './ui/uiManager';

const appContainer = document.getElementById('app');
if (!appContainer) {
  throw new Error('#app 要素が見つかりません');
}

const ui = new UIManager(appContainer);
ui.init();
