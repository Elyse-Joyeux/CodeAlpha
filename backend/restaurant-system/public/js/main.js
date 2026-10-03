import { S } from './state.js'
import {$, toast } from './ui.js'
import * as order from './views/kitchen.js'
import * as kitchen from './views/tables.js'
import * as admin from './views/admin.js'

const VIEWS = { order, kitchen, tables, admin };
const acts = { nav: v => go(v), ...order.actions, ...kitchen.actions, ...tables.actions, ...admin.actions}

async function go(v) {
    clearInterval(S.poll);
    S.view = v;
    document.querySelectorAll('nav button[data-id]').forEach((b) => {
        b.classList.toggle('on', b.dataset.id === v)
        b.toggleAttribute('aria-current', b.dataset.id === v)
    })

    try {
        await VIEWS[v].render()
    
    } catch (e) {
        if (v === 'admin' && !S.token) return admin.render();
        toast(e.message, 1)
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

document.addEventListener('submit', (e) => {
    e.preventDefault()
    $("#lf [data-act]")?.click();
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