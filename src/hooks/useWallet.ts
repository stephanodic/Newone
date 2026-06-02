import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, onSnapshot, serverTimestamp, writeBatch, getDocs,
  arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Wallet, WalletInvite } from '../types';
import { toast } from 'sonner';

const WALLET_CACHE_KEY = 'moneytrack_walletId';
export const MAX_WALLET_MEMBERS = 5;

/** Copies existing users/{uid}/categories and users/{uid}/transactions into wallets/{walletId}/... */
async function migrateUserDataToWallet(userId: string, walletId: string): Promise<void> {
  try {
    const catsSnap = await getDocs(collection(db, `users/${userId}/categories`));
    if (!catsSnap.empty) {
      const batch = writeBatch(db);
      catsSnap.docs.forEach(d =>
        batch.set(doc(db, `wallets/${walletId}/categories/${d.id}`), d.data())
      );
      await batch.commit();
    }

    const txSnap = await getDocs(collection(db, `users/${userId}/transactions`));
    const CHUNK = 500;
    for (let i = 0; i < txSnap.docs.length; i += CHUNK) {
      const batch = writeBatch(db);
      txSnap.docs.slice(i, i + CHUNK).forEach(d =>
        batch.set(doc(db, `wallets/${walletId}/transactions/${d.id}`), d.data())
      );
      await batch.commit();
    }

    // Copy relevant flags (categoriesSeeded, categoryMigrationV1) from user doc to wallet doc
    const userDoc = await getDoc(doc(db, `users/${userId}`));
    if (userDoc.exists()) {
      const d = userDoc.data();
      const flags: Record<string, unknown> = {};
      if (d.categoriesSeeded !== undefined) flags.categoriesSeeded = d.categoriesSeeded;
      if (d.categoryMigrationV1 !== undefined) flags.categoryMigrationV1 = d.categoryMigrationV1;
      if (Object.keys(flags).length) {
        await setDoc(doc(db, `wallets/${walletId}`), flags, { merge: true });
      }
    }

    console.log(`[Wallet] Migrated ${catsSnap.size} cats + ${txSnap.docs.length} txs → wallet ${walletId}`);
  } catch (err) {
    console.error('[Wallet] migrateUserDataToWallet failed:', err);
    throw err;
  }
}

export function useWallet(user: User | null) {
  const [walletId, setWalletIdState] = useState<string | null>(
    () => localStorage.getItem(WALLET_CACHE_KEY)
  );
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [forceReinit, setForceReinit] = useState(0);
  const initDoneRef   = useRef(false);
  const unsubRef      = useRef<(() => void) | null>(null);

  const persistWalletId = useCallback((id: string | null) => {
    setWalletIdState(id);
    if (id) localStorage.setItem(WALLET_CACHE_KEY, id);
    else     localStorage.removeItem(WALLET_CACHE_KEY);
  }, []);

  const subscribeWallet = useCallback((wId: string) => {
    unsubRef.current?.();
    unsubRef.current = onSnapshot(
      doc(db, `wallets/${wId}`),
      snap => {
        if (snap.exists()) setWallet({ id: snap.id, ...snap.data() } as Wallet);
        setWalletLoading(false);
      },
      err => { console.error('[Wallet] snapshot:', err); setWalletLoading(false); }
    );
  }, []);

  useEffect(() => {
    if (!user) {
      persistWalletId(null);
      setWallet(null);
      setWalletLoading(false);
      initDoneRef.current = false;
      unsubRef.current?.();
      unsubRef.current = null;
      return;
    }
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    const init = async () => {
      console.log(`[Wallet] init — uid=${user.uid} email=${user.email}`);

      const userDocRef = doc(db, `users/${user.uid}`);
      const userSnap   = await getDoc(userDocRef);
      let wId: string | null = userSnap.exists() ? (userSnap.data()?.walletId ?? null) : null;
      console.log(`[Wallet] users/${user.uid}.walletId =`, wId);

      // ── Accept a pending invite ───────────────────────────────────────────
      // Controlla SEMPRE (anche se l'utente ha già un wallet personale):
      // l'invite ha priorità e switcha l'utente al wallet condiviso.
      // Usa arrayUnion/arrayRemove per NON leggere il wallet doc prima di
      // essere membro — evita il permesso GET che potrebbe mancare.
      if (user.email) {
        const lowerEmail = user.email.toLowerCase();
        try {
          console.log(`[Wallet] checking invite for ${lowerEmail}`);
          const inviteSnap = await getDoc(doc(db, `invites/${lowerEmail}`));
          console.log(`[Wallet] invite exists =`, inviteSnap.exists());
          if (inviteSnap.exists()) {
            const inv = inviteSnap.data() as WalletInvite;
            console.log(`[Wallet] invite data =`, inv);
            // Non ri-accettare se siamo già su quel wallet
            if (inv.walletId !== wId) {
              console.log(`[Wallet] accepting invite → walletId=${inv.walletId}`);
              const memberInfo = { uid: user.uid, email: lowerEmail, displayName: user.displayName ?? '' };
              // arrayUnion/arrayRemove: scrittura diretta senza GET preventivo
              await updateDoc(doc(db, `wallets/${inv.walletId}`), {
                members:        arrayUnion(user.uid),
                pendingInvites: arrayRemove(lowerEmail),
                memberEmails:   arrayUnion(memberInfo),
              });
              console.log(`[Wallet] wallet updated — now member of ${inv.walletId}`);
              wId = inv.walletId;
              // Salva walletId nel doc utente (crea il doc se non esiste)
              await setDoc(userDocRef, { walletId: wId }, { merge: true });
              console.log(`[Wallet] users/${user.uid}.walletId saved`);
              await deleteDoc(doc(db, `invites/${lowerEmail}`));
              console.log(`[Wallet] invite deleted`);
              toast.success(`Hai accettato l'invito di ${inv.ownerName}! Ora condividi il wallet.`);
            } else {
              console.log(`[Wallet] already on invited wallet — skip re-accept`);
            }
          }
        } catch (err) {
          console.error('[Wallet] invite acceptance error:', err);
          // Se l'updateDoc del wallet ha avuto successo ma il setDoc del user doc
          // è fallito (es. regole), usiamo comunque wId dall'invite per questa sessione.
          // Al prossimo avvio il flusso si ripete e completerà il salvataggio.
        }
      }

      // ── Create wallet if user has none ────────────────────────────────────
      if (!wId) {
        console.log(`[Wallet] no wallet found — creating new one`);
        const walletRef = doc(collection(db, 'wallets'));
        wId = walletRef.id;
        const memberInfo = { uid: user.uid, email: user.email?.toLowerCase() ?? '', displayName: user.displayName ?? '' };
        await setDoc(walletRef, {
          ownerId:        user.uid,
          members:        [user.uid],
          memberEmails:   [memberInfo],
          pendingInvites: [],
          name:           'Il mio wallet',
          createdAt:      serverTimestamp(),
        });
        await setDoc(userDocRef, { walletId: wId }, { merge: true });
        // Migrate existing data from users/{uid} subcollections.
        // Non-blocking: if migration fails (e.g. rules not yet deployed) the wallet
        // is still valid and categories will be re-seeded automatically.
        migrateUserDataToWallet(user.uid, wId).catch(err =>
          console.warn('[Wallet] Migration skipped (will re-seed):', err)
        );
      }

      console.log(`[Wallet] final walletId =`, wId);
      persistWalletId(wId);
      subscribeWallet(wId);
    };

    init().catch(err => {
      console.error('[Wallet] init error:', err);
      setWalletLoading(false);
    });

    return () => { unsubRef.current?.(); unsubRef.current = null; };
  }, [user, forceReinit, persistWalletId, subscribeWallet]);

  // Detect real-time removal from wallet (snapshot fires with updated members array)
  useEffect(() => {
    if (!wallet || !user) return;
    if (!wallet?.members?.includes(user.uid)) {
      toast.info('Sei stato rimosso dal wallet condiviso.');
      unsubRef.current?.();
      unsubRef.current = null;
      // Clear walletId in Firestore so the next init won't re-subscribe to the same wallet.
      // The owner's removeMember tries this but may fail due to rules; the user can always
      // write their own doc. Firestore applies this locally before the re-init reads it.
      setDoc(doc(db, `users/${user.uid}`), { walletId: null }, { merge: true }).catch(() => {});
      persistWalletId(null);
      setWallet(null);
      initDoneRef.current = false;
      setForceReinit(n => n + 1);
    }
  }, [wallet, user, persistWalletId]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const inviteUser = useCallback(async (email: string) => {
    if (!wallet || !user) return;
    const e = email.trim().toLowerCase();
    if (!e || !e.includes('@')) { toast.error('Inserisci un indirizzo email valido.'); return; }
    if ((wallet.members ?? []).length >= MAX_WALLET_MEMBERS) {
      toast.error(`Il wallet può avere al massimo ${MAX_WALLET_MEMBERS} membri.`); return;
    }
    if ((wallet.memberEmails ?? []).some(m => m.email.toLowerCase() === e)) {
      toast.info('Questo utente è già nel wallet.'); return;
    }
    if ((wallet.pendingInvites ?? []).includes(e)) {
      toast.info('Invito già inviato a questo indirizzo.'); return;
    }
    try {
      await setDoc(doc(db, `invites/${e}`), {
        walletId:  wallet.id,
        ownerUid:  user.uid,
        ownerName: user.displayName ?? user.email ?? 'Un utente',
        walletName: wallet.name,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, `wallets/${wallet.id}`), {
        pendingInvites: [...(wallet.pendingInvites ?? []), e],
      });
      toast.success(`Invito inviato a ${e}`);
    } catch (err) {
      console.error('[Wallet] inviteUser:', err);
      toast.error("Errore durante l'invito");
    }
  }, [wallet, user]);

  const cancelInvite = useCallback(async (email: string) => {
    if (!wallet) return;
    try {
      await deleteDoc(doc(db, `invites/${email}`));
      await updateDoc(doc(db, `wallets/${wallet.id}`), {
        pendingInvites: (wallet.pendingInvites ?? []).filter(e => e !== email),
      });
      toast.success('Invito annullato');
    } catch (err) {
      console.error('[Wallet] cancelInvite:', err);
      toast.error("Errore durante l'annullamento");
    }
  }, [wallet]);

  /** Owner removes another member; a non-owner can also remove themselves (leave). */
  const removeMember = useCallback(async (targetUid: string) => {
    if (!wallet || !user) return;
    const isOwner = user.uid === wallet.ownerId;
    const isSelf  = user.uid === targetUid;
    if (!isOwner && !isSelf) { toast.error('Solo il proprietario può rimuovere i membri.'); return; }
    if (isOwner && targetUid === wallet.ownerId) { toast.error('Il proprietario non può rimuovere se stesso.'); return; }

    const memberEntry = (wallet.memberEmails ?? []).find(m => m.uid === targetUid);
    try {
      await updateDoc(doc(db, `wallets/${wallet.id}`), {
        members:      arrayRemove(targetUid),
        memberEmails: memberEntry ? arrayRemove(memberEntry) : (wallet.memberEmails ?? []).filter(m => m.uid !== targetUid),
      });
      // Best-effort: reset the removed user's walletId so they get a fresh wallet on next login.
      // This may fail if Firestore rules don't allow writing another user's doc — that's OK.
      try {
        await updateDoc(doc(db, `users/${targetUid}`), { walletId: null });
      } catch { /* non-blocking */ }

      if (isSelf) {
        // Current user left the wallet — reset locally
        unsubRef.current?.();
        unsubRef.current = null;
        persistWalletId(null);
        setWallet(null);
        initDoneRef.current = false;
        setForceReinit(n => n + 1);
        toast.success('Hai lasciato il wallet condiviso.');
      } else {
        toast.success(`${memberEntry?.displayName || memberEntry?.email || 'Membro'} rimosso dal wallet.`);
      }
    } catch (err) {
      console.error('[Wallet] removeMember:', err);
      toast.error('Errore durante la rimozione');
    }
  }, [wallet, user, persistWalletId]);

  return { walletId, wallet, walletLoading, inviteUser, cancelInvite, removeMember };
}
