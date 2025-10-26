import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/utils/auth.server';
import { getTerminalSessions } from '~/models/terminal.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireAuth({ request });
  
  try {
    const sessions = await getTerminalSessions(userId);
    return json({ sessions });
  } catch (error) {
    console.error('Failed to fetch terminal sessions:', error);
    return json(
      { error: 'Failed to fetch terminal sessions' },
      { status: 500 }
    );
  }
}
