import { CircuitGraph } from '../../shared/types'

export interface DebugPreset {
  id: string
  name: string
  description: string
  hint: string
  graph: CircuitGraph
}

export const DEBUG_PRESETS: DebugPreset[] = [
  {
    id: 'working',
    name: 'Working Circuit',
    description: 'Battery, resistor, LED, and ground — everything connected properly.',
    hint: 'This one is healthy. Use it as a reference.',
    graph: {
      components: [
        { id: 'bat1', type: 'battery', label: 'Battery 9V', value: 9, position: { x: 50, y: 150 } },
        { id: 'res1', type: 'resistor', label: 'R1 220\u03A9', value: 220, position: { x: 250, y: 150 } },
        { id: 'led1', type: 'led', label: 'LED1', position: { x: 450, y: 150 } },
        { id: 'gnd1', type: 'ground', label: 'GND', position: { x: 650, y: 150 } },
      ],
      edges: [
        { id: 'e1', sourceId: 'bat1', targetId: 'res1' },
        { id: 'e2', sourceId: 'res1', targetId: 'led1' },
        { id: 'e3', sourceId: 'led1', targetId: 'gnd1' },
      ],
    },
  },
  {
    id: 'missing_resistor',
    name: 'Missing Resistor',
    description: 'An LED wired directly to a battery — no current limiting.',
    hint: 'The district is getting too much traffic. What road feature is missing?',
    graph: {
      components: [
        { id: 'bat1', type: 'battery', label: 'Battery 9V', value: 9, position: { x: 50, y: 150 } },
        { id: 'led1', type: 'led', label: 'LED1', position: { x: 300, y: 150 } },
        { id: 'gnd1', type: 'ground', label: 'GND', position: { x: 550, y: 150 } },
      ],
      edges: [
        { id: 'e1', sourceId: 'bat1', targetId: 'led1' },
        { id: 'e2', sourceId: 'led1', targetId: 'gnd1' },
      ],
    },
  },
  {
    id: 'open_circuit',
    name: 'Open Circuit',
    description: 'A broken path — the LED is disconnected from ground.',
    hint: 'The road is incomplete. Why is the district dark?',
    graph: {
      components: [
        { id: 'bat1', type: 'battery', label: 'Battery 9V', value: 9, position: { x: 50, y: 150 } },
        { id: 'res1', type: 'resistor', label: 'R1 220\u03A9', value: 220, position: { x: 250, y: 150 } },
        { id: 'led1', type: 'led', label: 'LED1', position: { x: 450, y: 150 } },
        { id: 'gnd1', type: 'ground', label: 'GND', position: { x: 650, y: 300 } },
      ],
      edges: [
        { id: 'e1', sourceId: 'bat1', targetId: 'res1' },
        { id: 'e2', sourceId: 'res1', targetId: 'led1' },
      ],
    },
  },
  {
    id: 'short_circuit',
    name: 'Short Circuit',
    description: 'Battery wired straight to ground — no load at all.',
    hint: 'All power rushes through a crash path. What load is missing?',
    graph: {
      components: [
        { id: 'bat1', type: 'battery', label: 'Battery 9V', value: 9, position: { x: 100, y: 150 } },
        { id: 'gnd1', type: 'ground', label: 'GND', position: { x: 400, y: 150 } },
      ],
      edges: [
        { id: 'e1', sourceId: 'bat1', targetId: 'gnd1' },
      ],
    },
  },
  {
    id: 'no_ground',
    name: 'Floating Ground',
    description: 'A circuit with no ground — current has nowhere to return.',
    hint: 'The city has no return network. What is missing?',
    graph: {
      components: [
        { id: 'bat1', type: 'battery', label: 'Battery 9V', value: 9, position: { x: 50, y: 150 } },
        { id: 'res1', type: 'resistor', label: 'R1 220\u03A9', value: 220, position: { x: 250, y: 150 } },
        { id: 'led1', type: 'led', label: 'LED1', position: { x: 450, y: 150 } },
      ],
      edges: [
        { id: 'e1', sourceId: 'bat1', targetId: 'res1' },
        { id: 'e2', sourceId: 'res1', targetId: 'led1' },
      ],
    },
  },
  {
    id: 'switch_open',
    name: 'Open Switch',
    description: 'A complete circuit but the switch is turned off.',
    hint: 'Everything looks wired correctly, but the switch is not toggled. Double-click it!',
    graph: {
      components: [
        { id: 'bat1', type: 'battery', label: 'Battery 9V', value: 9, position: { x: 50, y: 150 } },
        { id: 'sw1', type: 'switch', label: 'SW1', value: 0, position: { x: 200, y: 150 } },
        { id: 'res1', type: 'resistor', label: 'R1 220\u03A9', value: 220, position: { x: 370, y: 150 } },
        { id: 'led1', type: 'led', label: 'LED1', position: { x: 540, y: 150 } },
        { id: 'gnd1', type: 'ground', label: 'GND', position: { x: 710, y: 150 } },
      ],
      edges: [
        { id: 'e1', sourceId: 'bat1', targetId: 'sw1' },
        { id: 'e2', sourceId: 'sw1', targetId: 'res1' },
        { id: 'e3', sourceId: 'res1', targetId: 'led1' },
        { id: 'e4', sourceId: 'led1', targetId: 'gnd1' },
      ],
    },
  },
]
