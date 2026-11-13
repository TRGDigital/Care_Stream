// Topic clusters for the related-content block. A cluster is a key stored on blog posts and
// collections (topic_cluster). The label and intro are the only copy; the links are generated.
export interface TopicCluster { key: string; label: string; intro: string }

export const TOPIC_CLUSTERS: TopicCluster[] = [
  { key: 'care-certificate', label: 'Care Certificate', intro: 'Guides and tools for the Care Certificate, from the standards to the free course and the records.' },
  { key: 'audits', label: 'care home audits', intro: 'Guides and free tools for running care home audits and keeping the evidence.' },
  { key: 'policies', label: 'care policies', intro: 'Guides on the policies a care service needs and how inspectors read them.' },
]

export function clusterInfo(key: string): TopicCluster {
  return TOPIC_CLUSTERS.find(c => c.key === key) ?? { key, label: key.replace(/-/g, ' '), intro: '' }
}

export const CLUSTER_LINK_CAP = 10
