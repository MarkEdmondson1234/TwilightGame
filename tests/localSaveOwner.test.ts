/**
 * @vitest-environment node
 *
 * The local save is one slot per browser, not per account. On a family laptop
 * it is whoever played last, and "newer than the cloud" then means "somebody
 * else's game". Signing in used to upload that game — inventory, garden, the
 * lot — over the account's own cloud save: "her personal garden is completely
 * planted and she says she didn't do it".
 *
 * decideSignInSync() is the whole rule. The timestamp race only applies to a
 * save the account made itself; anyone else's never wins on age.
 */
import { describe, it, expect } from 'vitest';
import { decideSignInSync, LOCAL_SAVE_OWNER_SIGNED_OUT } from '../firebase/syncManager';

const ME = 'uid-nomi';
const SOMEONE_ELSE = 'uid-mark';

describe('decideSignInSync', () => {
  it('keeps the timestamp race for the account’s own save', () => {
    expect(
      decideSignInSync({ uid: ME, localOwner: ME, localTimestamp: 200, cloudTimestamp: 100 })
    ).toBe('upload');
    expect(
      decideSignInSync({ uid: ME, localOwner: ME, localTimestamp: 100, cloudTimestamp: 200 })
    ).toBe('download');
    expect(
      decideSignInSync({ uid: ME, localOwner: ME, localTimestamp: 100, cloudTimestamp: 100 })
    ).toBe('in-sync');
  });

  it('treats an untagged save (written before the tag existed) as the account’s own', () => {
    expect(
      decideSignInSync({ uid: ME, localOwner: null, localTimestamp: 200, cloudTimestamp: 100 })
    ).toBe('upload');
  });

  it('lets the cloud win over another account’s game, however new it is', () => {
    expect(
      decideSignInSync({
        uid: ME,
        localOwner: SOMEONE_ELSE,
        localTimestamp: Date.now(),
        cloudTimestamp: 1,
      })
    ).toBe('download-foreign');
  });

  it('lets the cloud win over a signed-out session’s game', () => {
    expect(
      decideSignInSync({
        uid: ME,
        localOwner: LOCAL_SAVE_OWNER_SIGNED_OUT,
        localTimestamp: Date.now(),
        cloudTimestamp: 1,
      })
    ).toBe('download-foreign');
  });

  it('adopts signed-out play for an account with no cloud save yet', () => {
    // Playing offline, then signing up to keep it: the one case a foreign
    // save is welcome.
    expect(
      decideSignInSync({
        uid: ME,
        localOwner: LOCAL_SAVE_OWNER_SIGNED_OUT,
        localTimestamp: 200,
        cloudTimestamp: 0,
      })
    ).toBe('upload');
  });

  it('starts a new account fresh rather than inheriting another account’s game', () => {
    expect(
      decideSignInSync({
        uid: ME,
        localOwner: SOMEONE_ELSE,
        localTimestamp: 200,
        cloudTimestamp: 0,
      })
    ).toBe('reset-foreign');
  });

  it('does nothing when there is no save anywhere', () => {
    expect(
      decideSignInSync({ uid: ME, localOwner: SOMEONE_ELSE, localTimestamp: 0, cloudTimestamp: 0 })
    ).toBe('in-sync');
  });
});
