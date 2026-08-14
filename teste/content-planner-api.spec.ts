import { test, expect } from '@playwright/test';

test('o Planejador usa somente a API autenticada da VPS', async ({ page }) => {
    const calls: { method: string; resource: string; body: any }[] = [];
    await page.route(/\/api\/content-planner(?:\?|$)/, async route => {
        const request = route.request();
        const url = new URL(request.url());
        const resource = url.searchParams.get('resource') || 'posts';
        const body = request.postDataJSON?.() || null;
        calls.push({ method: request.method(), resource, body });

        const post = {
            id: '11111111-1111-4111-8111-111111111111',
            title: body?.title || 'POST TESTE',
            post_date: body?.post_date || '2026-08-14',
            status: body?.status || 'nao_iniciado',
            category: body?.category || 'PAUTA FRIA',
            format: body?.format || 'video',
            networks: body?.networks || ['INSTA'],
            content: null,
            objective: null,
            editorial: null,
            script: null,
            caption: null,
            hashtags: null,
            reference: null,
            obs: null,
            paid_traffic: false,
            ai_detail: null,
            created_at: '2026-08-14T12:00:00Z',
            updated_at: '2026-08-14T12:00:00Z',
        };

        const data = resource === 'posts' ? (request.method() === 'GET' ? [post] : post)
            : resource === 'radar' ? []
            : resource === 'inbox' ? []
            : resource === 'instagram' ? []
            : resource === 'catalog' ? []
            : null;
        await route.fulfill({
            status: request.method() === 'POST' ? 201 : 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data }),
        });
    });

    await page.goto('/');
    const result = await page.evaluate(async () => {
        const planner = await import('/lib/contentPlanner.ts');
        const radar = await import('/lib/contentRadar.ts');
        const inbox = await import('/lib/contentInbox.ts');
        const instagram = await import('/lib/instagramMetrics.ts');

        const posts = await planner.fetchContentPosts('2026-08-01', '2026-08-31');
        const saved = await planner.saveContentPost({
            title: 'NOVO POST',
            post_date: '2026-08-14',
            status: 'nao_iniciado',
            category: 'PAUTA FRIA',
            format: 'video',
            networks: ['INSTA'],
            content: null,
            objective: null,
            editorial: null,
            script: null,
            caption: null,
            hashtags: null,
            reference: null,
            obs: null,
            paid_traffic: false,
            ai_detail: null,
        });
        await planner.deleteContentPost(saved.id);
        await radar.fetchRadarItems(3);
        await inbox.fetchPendingInbox();
        await instagram.fetchInstagramMetrics(60);
        await inbox.buildCatalogContext();
        return { postCount: posts.length, savedTitle: saved.title };
    });

    expect(result).toEqual({ postCount: 1, savedTitle: 'NOVO POST' });
    expect(calls.map(call => `${call.method}:${call.resource}`)).toEqual([
        'GET:posts',
        'POST:posts',
        'DELETE:posts',
        'GET:radar',
        'GET:inbox',
        'GET:instagram',
        'GET:catalog',
    ]);
    expect(calls[1].body.title).toBe('NOVO POST');
});

function mockResponse() {
    const state = { status: 200, body: undefined as any, headers: {} as Record<string, string> };
    const response = {
        setHeader(name: string, value: string) {
            state.headers[name.toLowerCase()] = value;
            return response;
        },
        status(code: number) {
            state.status = code;
            return response;
        },
        json(body: any) {
            state.body = body;
            return response;
        },
    };
    return { state, response };
}

test('a API bloqueia leitura sem sessão e mutação sem origem confiável', async () => {
    const { default: handler } = await import('../api/content-planner');

    const get = mockResponse();
    await handler({ method: 'GET', headers: {}, query: { resource: 'posts' } }, get.response);
    expect(get.state.status).toBe(401);
    expect(get.state.body).toEqual({ success: false, error: 'Não autorizado' });
    expect(get.state.headers['cache-control']).toBe('private, no-store');

    const post = mockResponse();
    await handler({ method: 'POST', headers: {}, query: { resource: 'posts' }, body: {} }, post.response);
    expect(post.state.status).toBe(403);
    expect(post.state.body).toEqual({ success: false, error: 'origin_not_allowed' });
});
