import './style.css'

import clippy from './clippy';

const agent = await clippy.load('clippy');

if (agent) {
  agent.animate();
}
