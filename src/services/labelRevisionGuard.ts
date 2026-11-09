import { AxiosInstance } from 'axios';

/** A page keeps its original label revision; background refreshes must not
 * silently turn a stale editor into a valid writer after restore/clear/merge. */
export function installLabelRevisionGuard(client: AxiosInstance) {
  const revisions = new Map<string, string>();
  const owners = new Map<string, string>();
  client.interceptors.request.use((config) => {
    const match = config.url?.match(
      /\/(projects|files|sources|translations|tips|targets)\/([a-f\d]{24})(?:\/|$)/i,
    );
    const projectId =
      match && (match[1] === 'projects' ? match[2] : owners.get(match[2]));
    if (
      projectId &&
      revisions.has(projectId) &&
      !['get', 'head', 'options'].includes(
        (config.method || 'get').toLowerCase(),
      )
    ) {
      config.headers.set('X-Label-Revision', revisions.get(projectId));
    }
    return config;
  });
  client.interceptors.response.use((response) => {
    const projectId = response.headers['x-label-project'];
    const revision = response.headers['x-label-revision'];
    if (projectId && revision !== undefined) {
      if (!revisions.has(projectId)) revisions.set(projectId, String(revision));
      const visit = (value: unknown) => {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') {
          const row = value as Record<string, unknown>;
          if (typeof row.id === 'string') owners.set(row.id, projectId);
          Object.values(row).forEach(visit);
        }
      };
      visit(response.data);
      const match = response.config.url?.match(
        /\/(projects|files|sources|translations|tips|targets)\/([a-f\d]{24})(?:\/|$)/i,
      );
      if (match) owners.set(match[2], projectId);
    }
    return response;
  });
}
