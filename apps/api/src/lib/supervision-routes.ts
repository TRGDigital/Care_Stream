// Which /workforce paths are supervisions and appraisals (Starter and above) rather than the credentials register or the training link (Enterprise).
export const isSupervisionRoute = (path: string) => /^\/supervisions(\/|$)/.test(path) || /^\/staff\/[^/]+\/supervisions\/?$/.test(path)
