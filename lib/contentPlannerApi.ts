interface PlannerApiOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    query?: Record<string, string | number | undefined>;
    body?: unknown;
}

/** Cliente único do Planejador: sessão httpOnly + API server-side da VPS. */
export async function contentPlannerRequest<T>(
    resource: 'posts' | 'radar' | 'inbox' | 'instagram' | 'catalog',
    options: PlannerApiOptions = {},
): Promise<T> {
    const params = new URLSearchParams({ resource });
    for (const [key, value] of Object.entries(options.query || {})) {
        if (value !== undefined) params.set(key, String(value));
    }

    const method = options.method || 'GET';
    const response = await fetch(`/api/content-planner?${params.toString()}`, {
        method,
        credentials: 'same-origin',
        cache: 'no-store',
        headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || `Falha ao acessar o Planejador (${response.status}).`);
    }
    return payload.data as T;
}
