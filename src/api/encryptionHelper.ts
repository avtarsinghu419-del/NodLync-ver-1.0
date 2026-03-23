// Standardized encryption helper for API keys and sensitive values.

const ENCRYPTION_KEY_NAME = 'nodlync_master_key';

/**
 * Gets or creates a master key for local encryption/decryption.
 * Note: In a production app, this key should ideally come from a secure source 
 * or be derived from a user passphrase.
 */
async function getMasterKey(): Promise<CryptoKey> {
  const existingKey = localStorage.getItem(ENCRYPTION_KEY_NAME);
  if (existingKey) {
    const keyData = new Uint8Array(atob(existingKey).split('').map(c => c.charCodeAt(0)));
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  const newKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  const exported = await crypto.subtle.exportKey('raw', newKey);
  const base64Key = btoa(String.fromCharCode(...new Uint8Array(exported)));
  localStorage.setItem(ENCRYPTION_KEY_NAME, base64Key);
  
  return newKey;
}

export async function encryptValue(text: string): Promise<{ encrypted: string; iv: string }> {
  try {
    const key = await getMasterKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    
    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv))
    };
  } catch (err) {
    console.error('Encryption failed:', err);
    throw new Error('Could not encrypt value.');
  }
}

export async function decryptValue(encryptedBase64: string, ivBase64: string): Promise<string> {
  try {
    if (ivBase64 === "plain-text") return encryptedBase64; // Fallback for legacy items

    const key = await getMasterKey();
    const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
    const data = new Uint8Array(atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('Could not decrypt value. It may have been encrypted with a different key.');
  }
}
