import { useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { activityController, type ActivityAction } from '../../controllers/activityController';

/** Records a staff action in the activity log, in the signed-in person's name. */
export function useActivity() {
  const { user, userData, role } = useAuth();
  return useCallback(
    (action: ActivityAction, summary: string, targetId = '') =>
      activityController.record({ user, name: userData?.displayName, role }, action, summary, targetId),
    [user, userData?.displayName, role],
  );
}
