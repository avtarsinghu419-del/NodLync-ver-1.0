import { useMemo } from "react";
import ReactFlow, { Background, Controls } from "reactflow";
import type { Edge, Node } from "reactflow";
import "reactflow/dist/style.css";

type Props = {
  workflowJson: any;
};

type N8nNode = {
  id?: string;
  name?: string;
  type?: string;
  position?: { x: number; y: number } | [number, number];
};

const getNodePosition = (node: N8nNode, index: number) => {
  const pos = node.position as any;
  if (Array.isArray(pos) && pos.length >= 2) {
    return { x: Number(pos[0]) || index * 180, y: Number(pos[1]) || 0 };
  }
  if (pos && typeof pos === "object" && typeof pos.x === "number" && typeof pos.y === "number") {
    return { x: pos.x, y: pos.y };
  }
  // fallback grid
  return { x: index * 220, y: (index % 5) * 130 };
};

const collectTargets = (value: any, acc: any[] = []) => {
  if (Array.isArray(value)) {
    value.forEach((v) => collectTargets(v, acc));
    return acc;
  }
  if (value && typeof value === "object") {
    if (typeof value.node === "string") acc.push(value);
  }
  return acc;
};

const buildGraph = (workflowJson: any) => {
  const json = workflowJson ?? {};
  const n8nNodes: N8nNode[] = Array.isArray(json.nodes) ? json.nodes : [];
  const connections: any = json.connections ?? {};

  const nameToId = new Map<string, string>();
  const nodes: Node[] = n8nNodes.map((n, idx) => {
    const id = typeof n.id === "string" ? n.id : `node_${idx}`;
    const label = (n.name && n.name.trim()) || (n.type && n.type.trim()) || id;
    if (n.name && typeof n.name === "string") nameToId.set(n.name, id);
    return {
      id,
      position: getNodePosition(n, idx),
      data: { label },
    };
  });

  // If connections refer to names, build mapping for those names too
  // (some exports might not include node.id properly)
  if (nodes.length === 0) {
    return { nodes: [], edges: [] as Edge[] };
  }

  const edges: Edge[] = [];
  const seen = new Set<string>();

  const addEdge = (sourceName: string, targetName: string, idx: number) => {
    const sourceId = nameToId.get(sourceName) ?? null;
    const targetId = nameToId.get(targetName) ?? null;
    if (!sourceId || !targetId) return;

    const edgeKey = `${sourceId}->${targetId}:${idx}`;
    if (seen.has(edgeKey)) return;
    seen.add(edgeKey);

    edges.push({
      id: edgeKey,
      source: sourceId,
      target: targetId,
      label: "",
      animated: false,
      style: { strokeWidth: 1.2 },
    });
  };

  for (const sourceName of Object.keys(connections)) {
    const byType = connections[sourceName] ?? {};
    for (const connType of Object.keys(byType)) {
      const port = byType[connType];
      const targets = collectTargets(port, []);
      targets.forEach((t: any, i: number) => {
        if (t && typeof t.node === "string") {
          addEdge(sourceName, t.node, i);
        }
      });
    }
  }

  return { nodes, edges };
};

const WorkflowReactFlowView = ({ workflowJson }: Props) => {
  const graph = useMemo(() => buildGraph(workflowJson), [workflowJson]);
  const hasGraph = graph.nodes.length > 0;

  return (
    <div className="h-[65vh] w-full">
      {!hasGraph ? (
        <div className="h-full flex items-center justify-center text-sm text-fg-muted">
          Visual view not available for this workflow JSON.
        </div>
      ) : (
        <ReactFlow
          nodes={graph.nodes}
          edges={graph.edges}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      )}
    </div>
  );
};

export default WorkflowReactFlowView;

