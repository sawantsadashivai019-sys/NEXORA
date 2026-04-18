import React, { useEffect, useState, useCallback } from 'react';
import {ReactFlow, MiniMap, Controls, Background, Node, Edge, applyNodeChanges, applyEdgeChanges, addEdge, useNodesState, useEdgesState } from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import { generateMindMap } from '@/services/grokService';
import type { KnowledgeBase, Source } from '@/types';
import { Loader2 } from 'lucide-react';

interface MindMapPanelProps {
  currentKnowledgeBase: KnowledgeBase | null;
  onNodeClick: (sourceId: string, snippet: string) => void;
  // existingData may be either the internal graph {nodes, edges}
  // or the backend persisted MapNode[]/MapNode JSON — accept both
  existingData?: any;
  onDataChange?: (data: { nodes: Node[], edges: Edge[] }) => void;
}

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 200;
const nodeHeight = 60;

const layoutNodes = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({ rankdir: 'LR' });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const n = dagreGraph.node(node.id);
    node.position = { x: n.x - nodeWidth / 2, y: n.y - nodeHeight / 2 };
    return node;
  });
};

const DarkNode: React.FC<any> = ({ data }) => {
  return (
    <div className="p-4 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-lg hover:shadow-xl hover:border-[var(--color-primary)] transition-all min-w-[150px]">
      <div className="font-semibold text-sm text-[var(--color-primary)] mb-1">{data.label}</div>
      <div className="text-xs text-[var(--color-text-secondary)] line-clamp-2">{data.content}</div>
    </div>
  );
};

const MindMapPanel: React.FC<MindMapPanelProps> = ({ currentKnowledgeBase, onNodeClick, existingData, onDataChange }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const nodeTypes = { darkNode: DarkNode };

  const flattenToGraph = (rootNodes: any[], prefix = 'n') => {
    const resultNodes: Node[] = [];
    const resultEdges: Edge[] = [];

    const visit = (node: any, parentId?: string) => {
      const id = node.id || `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
      resultNodes.push({ id, type: 'darkNode', data: { label: node.label, content: node.content || '' }, position: { x: 0, y: 0 } });
      if (parentId) {
        resultEdges.push({ id: `${parentId}-${id}`, source: parentId, target: id, animated: true });
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach((c: any) => visit(c, id));
      }
      // Attach metadata to node for click handling
      resultNodes[resultNodes.length - 1].data = { ...resultNodes[resultNodes.length - 1].data, sourceRef: node.source_ref, snippet: node.text_snippet };
    };

    rootNodes.forEach(r => visit(r));
    return { nodes: resultNodes, edges: resultEdges };
  };

  const handleGenerate = useCallback(async () => {
    if (!currentKnowledgeBase) return;
    setIsLoading(true);
    setError('');
    try {
      const resp = await generateMindMap(currentKnowledgeBase.id);
      const payload = resp.mindmap || resp;
      const { nodes: graphNodes, edges: graphEdges } = flattenToGraph(payload);
      const laidOutNodes = layoutNodes(graphNodes, graphEdges);
      setNodes(laidOutNodes);
      setEdges(graphEdges);
      
      // Update parent state
      if (onDataChange) {
          onDataChange({ nodes: laidOutNodes, edges: graphEdges });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to generate mind map');
    } finally {
      setIsLoading(false);
    }
  }, [currentKnowledgeBase, setNodes, setEdges, onDataChange]);

  useEffect(() => {
    // Accept two shapes for `existingData`:
    //  - { nodes: Node[], edges: Edge[] }  (frontend graph)
    //  - MapNode[] | MapNode  (backend persisted mindmap JSON)
    if (existingData) {
        // Already a graph
        if (existingData.nodes && Array.isArray(existingData.nodes) && existingData.nodes.length > 0) {
            setNodes(existingData.nodes);
            setEdges(existingData.edges || []);
            return;
        }

        // If it's backend MapNode(s), convert to graph using the same flattening logic
        const isMapNode = (n: any) => n && (n.id || n.label);
        if (Array.isArray(existingData) ? existingData.some(isMapNode) : isMapNode(existingData)) {
            const roots = Array.isArray(existingData) ? existingData : [existingData];
            const { nodes: graphNodes, edges: graphEdges } = flattenToGraph(roots);
            const laidOutNodes = layoutNodes(graphNodes, graphEdges);
            setNodes(laidOutNodes);
            setEdges(graphEdges);
            return;
        }
    }

    if (currentKnowledgeBase) {
      handleGenerate();
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [currentKnowledgeBase, existingData]); // now reacts to persisted backend mindmap being passed in


  const onNodeClickInternal = (_: any, node: Node) => {
    const sourceId = (node.data as any).sourceRef;
    const snippet = (node.data as any).snippet || '';
    if (sourceId && onNodeClick) onNodeClick(sourceId, snippet);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-background)] rounded-lg border border-[var(--color-border)] overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
         {isLoading && <Loader2 className="animate-spin text-[var(--color-primary)]" size={16} />}
         {!isLoading && error && <span className="text-[var(--color-danger)] text-sm">Failed to generate</span>}
      </div>
      
      <div className="w-full h-full">
        {/* React Flow */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClickInternal}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} color="var(--color-border)" />
          <Controls className="bg-[var(--color-surface)] border border-[var(--color-border)] fill-[var(--color-text-primary)]" />
          <MiniMap className="bg-[var(--color-surface)] border border-[var(--color-border)]" />
        </ReactFlow>
      </div>
    </div>
  );
};

export default MindMapPanel;
