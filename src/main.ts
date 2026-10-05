import { Application } from './app/application';
import './ui/styles.css';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Application root is missing.');
const application = new Application(root);
void application.boot();
if (import.meta.hot) import.meta.hot.dispose(() => { void application.dispose(); });
