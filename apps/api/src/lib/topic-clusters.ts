// Topic clusters for the related-content block. A cluster is a key stored on blog posts and
// collections (topic_cluster). The label and intro are the only copy; the links are generated.
export interface TopicCluster { key: string; label: string; intro: string }

export const TOPIC_CLUSTERS: TopicCluster[] = [
  { key: 'care-certificate', label: 'Care Certificate', intro: 'Guides and tools for the Care Certificate, from the standards to the free course and the records.' },
  { key: 'audits', label: 'care home audits', intro: 'Guides and free tools for running care home audits and keeping the evidence.' },
  { key: 'policies', label: 'care policies', intro: 'Guides on the policies a care service needs and how inspectors read them.' },
  { key: 'mandatory-training', label: 'mandatory care training', intro: 'What each mandatory course covers, how often to refresh it, and the free CPD certified courses.' },
  { key: 'training-management', label: 'care training management', intro: 'Running a training matrix, calendar and records so staff stay current and the evidence is ready.' },
  { key: 'cqc-inspection', label: 'CQC inspection', intro: 'How the Care Quality Commission assesses a service, and the evidence that answers it.' },
  { key: 'multilingual-workforce', label: 'multilingual care teams', intro: 'Inducting, training and checking understanding across an international workforce.' },
]

export function clusterInfo(key: string): TopicCluster {
  return TOPIC_CLUSTERS.find(c => c.key === key) ?? { key, label: key.replace(/-/g, ' '), intro: '' }
}

export const CLUSTER_LINK_CAP = 10
