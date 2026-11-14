import axios from 'axios';
import { installLabelRevisionGuard } from './labelRevisionGuard';

const project = '000000000000000000000001';
const source = '000000000000000000000002';
const translation = '000000000000000000000003';

function fixture() {
  let revision = '0';
  const sent: Array<string | undefined> = [];
  const client = axios.create({
    adapter: async (config) => {
      sent.push(config.headers.get('X-Label-Revision') as string | undefined);
      return {
        config,
        status: 200,
        statusText: 'OK',
        headers: { 'x-label-project': project, 'x-label-revision': revision },
        data: { id: source, translations: [{ id: translation }] },
      };
    },
  });
  installLabelRevisionGuard(client);
  return {
    client,
    sent,
    change: (value: string) => {
      revision = value;
    },
  };
}

test('keeps the original page revision after background refresh', async () => {
  const { client, sent, change } = fixture();
  await client.get(`/v1/projects/${project}`);
  change('1');
  await client.get(`/v1/sources/${source}`);
  await client.put(`/v1/sources/${source}`, { content: 'old edit' });
  expect(sent[2]).toBe('0');
});

test('maps nested translation records to their owning project', async () => {
  const { client, sent } = fixture();
  await client.get(`/v1/projects/${project}/files`);
  await client.put(`/v1/translations/${translation}`, { content: 'edit' });
  expect(sent[1]).toBe('0');
});

test('does not attach write versions to reads or unrelated resources', async () => {
  const { client, sent } = fixture();
  await client.get(`/v1/projects/${project}`);
  await client.get(`/v1/sources/${source}`);
  await client.post('/v1/teams/000000000000000000000004', {});
  expect(sent.every((value) => value == null)).toBe(true);
});

test('a reopened editor starts with the latest revision', async () => {
  const { client, sent, change } = fixture();
  change('7');
  await client.get(`/v1/sources/${source}`);
  await client.delete(`/v1/sources/${source}`);
  expect(sent[1]).toBe('7');
});
