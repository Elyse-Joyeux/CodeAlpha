import { S } from './state.js'
import {$, toast } from './ui.js'
import * as order from './views/order.js'
import * as kitchen from './views/kitchen.js'
import * as tables from './views/tables.js'
import * as admin from './views/admin.js'

const VIEWS = { order, kitchen, tables, admin };
const acts = { nav: v => go(v), retry: () => go(S.view), ...order.actions, ...kitchen.actions, ...tables.actions, ...admin.actions}

async function go(v) {
    if (!VIEWS[v]) return;
    clearInterval(S.poll);
    S.view = v;
    $('#view').setAttribute('aria-busy', 'true');
    document.querySelectorAll('nav button[data-id]').forEach((b) => {
        b.classList.toggle('on', b.dataset.id === v)
        b.toggleAttribute('aria-current', b.dataset.id === v)
    })

    try {
        await VIEWS[v].render()
    
    } catch (e) {
        if (v === 'admin' && !S.token) {
            await admin.render();
        } else {
            const message = String(e.message || 'Please check the connection and try again.').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
            $('#view').innerHTML = `<section class="error-state"><p class="eyebrow">Connection interrupted</p><h1>This screen could not load</h1><p>${message}</p><button class="btn" data-act="retry">Try again</button></section>`;
        }
    } finally {
        $('#view').setAttribute('aria-busy', 'false');
    }
}

// one delegated listener drives every button via data-act
document.addEventListener('click', async(e) => {
    const b = e.target.closest('[data-act]')
    if(!b) return;

    try {
        await acts[b.dataset.act](b.dataset.id, b);

    } catch (x) {
        toast(x.message, 1)
        if(S.view === 'admin' && !S.token) admin.render()
    }
})

document.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (e.target.id === 'lf') {
        try { await acts.login() }
        catch (x) { toast(x.message, 1) }
    }
})

document.addEventListener('input', (e) => {
    if(e.target.id === 'note') S.note = e.target.value
})

document.addEventListener('change', (e) => {
    if(e.target.id === 'tsel') S.table = e.target.value;
    if(["rd", "rt", "rg"].includes(e.target.id)) tables.checkAvailability();
    admin.onChange(e);
})


go('order')
