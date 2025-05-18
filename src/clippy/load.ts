import Agent from './agent';
import type { AgentData } from './types';

type AgentName = 'clippy';

export default async function load(
  name: AgentName,
) {
  const path = 'assets/' + name;

  try {
    const data = await loadAgentData(path);

    const agent = new Agent(path, data);

    return agent;
  } catch(e) {
    console.log(e);
  }
}

async function loadAgentData(path: string): Promise<AgentData> {
  const src = './' + path + '/agent.ts';
  const agent = await import(src);

  return agent.data;
}

// TODO: add sounds
function loadSounds() {
}
