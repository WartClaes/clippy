import './style.css'

import clippy from './clippy';

const agent = await clippy.load('clippy');

if (agent) {
  agent.show();
  agent.animate();
  agent.speak('Hello', true);
}
