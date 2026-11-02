import { describe, it, expect, vi } from 'vitest';
import { obtenerOCrearPersona } from '../personaHelper';
import { supabase } from '../supabaseClient';

// Simulamos (mockeamos) Supabase
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(() => Promise.resolve({ data: null })) })) })),
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { id: '123' }, error: null })) })) })),
    })),
  },
}));

describe('personaHelper', () => {
  it('debe fallar si no hay consentimiento', async () => {
    const res = await obtenerOCrearPersona({
      nombre_completo: 'Test',
      telefono: '1234567890',
      consentimiento_aceptado: false,
    });
    expect(res).toBeNull(); // Rechaza guardar sin consentimiento
  });
});
