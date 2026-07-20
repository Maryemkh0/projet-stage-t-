// clients.js – CRUD UI for clients

document.addEventListener('DOMContentLoaded', () => {
    loadClients();
    document.getElementById('btn-add-client').addEventListener('click', () => openModal());
    document.getElementById('btn-save-client').addEventListener('click', saveClient);
    document.getElementById('btn-cancel-client').addEventListener('click', closeModal);
});

async function loadClients() {
    const resp = await fetch('/api/clients');
    const clients = await resp.json();
    const tbody = document.querySelector('#clients-table tbody');
    tbody.innerHTML = '';
    clients.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.id}</td>
            <td>${c.name}</td>
            <td>${c.email || ''}</td>
            <td>${c.description || ''}</td>
            <td>
                <button class="btn small" onclick="editClient(${c.id})">✏️</button>
                <button class="btn danger small" onclick="deleteClient(${c.id})">🗑️</button>
                <button class="btn primary small" onclick="runPipeline(${c.id})">▶️ Run</button>
            </td>`;
        tbody.appendChild(tr);
    });
}

function openModal(client = {}) {
    editMode = !!client.id;
    editId = client.id || null;
    document.getElementById('client-name').value = client.name || '';
    document.getElementById('client-email').value = client.email || '';
    document.getElementById('client-desc').value = client.description || '';
    document.getElementById('modal-title').textContent = editMode ? 'Modifier le client' : 'Nouveau client';
    document.getElementById('client-modal').classList.add('show');
}

function closeModal() {
    document.getElementById('client-modal').classList.remove('show');
}

async function saveClient() {
    const data = {
        name: document.getElementById('client-name').value,
        email: document.getElementById('client-email').value,
        description: document.getElementById('client-desc').value
    };
    if (editMode) {
        await fetch(`/api/clients/${editId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
    } else {
        await fetch('/api/clients', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
    }
    closeModal();
    loadClients();
}

async function deleteClient(id) {
    if (!confirm('Supprimer ce client ?')) return;
    await fetch(`/api/clients/${id}`, {method: 'DELETE'});
    loadClients();
}

async function editClient(id) {
    const response = await fetch(`/api/clients/${id}`);
    const client = await response.json();
    openModal(client);
}

async function runPipeline(id) {
    const resp = await fetch(`/api/clients/${id}/run`, {method: 'POST'});
    const text = await resp.text();
    alert(text);
}
