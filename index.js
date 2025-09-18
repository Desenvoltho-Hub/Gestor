/** THIS IS A GENERATED FILE. DO NOT EDIT. EDITS SHOULD BE MADE IN index.tsx AND RECOMPILED. */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
class GestorApp {
    state;
    activeScreen = 'painel';
    activeSalesTab = 'pipeline';
    editingTransactionId = null;
    activeChart = null;
    STAGES = ['Lead', 'Proposta', 'Negociação', 'Ganho', 'Perdido'];
    // DOM Elements
    sidebar;
    mainContent;
    modalContainer;
    modalContent;
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.mainContent = document.getElementById('main-content');
        this.modalContainer = document.getElementById('modal-container');
        this.modalContent = document.getElementById('modal-content');
        this.state = this.loadState();
        this.init();
    }
    // --- Core Methods ---
    init() {
        this.setupEventListeners();
        this.navigateTo(this.activeScreen);
    }
    setupEventListeners() {
        // Navigation
        this.sidebar.addEventListener('click', (e) => {
            const target = e.target;
            const navBtn = target.closest('.nav-btn');
            if (navBtn) {
                const screen = navBtn.getAttribute('data-screen');
                if (screen)
                    this.navigateTo(screen);
            }
        });
        // Backup & Restore
        document.getElementById('save-backup-btn')?.addEventListener('click', () => this.saveBackup());
        document.getElementById('load-backup-btn')?.addEventListener('click', () => document.getElementById('backup-file-input')?.click());
        document.getElementById('backup-file-input')?.addEventListener('change', (e) => this.loadBackup(e));
        // Global Search (simplified)
        document.getElementById('global-search')?.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (query.length > 2) {
                this.showGlobalSearchResults(query);
            }
        });
    }
    navigateTo(screen) {
        this.activeScreen = screen;
        // Update active button style
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.nav-btn[data-screen="${screen}"]`)?.classList.add('active');
        // Kill any existing chart before rendering new content
        if (this.activeChart) {
            this.activeChart.destroy();
            this.activeChart = null;
        }
        // Render screen content
        switch (screen) {
            case 'painel':
                this.renderPainel();
                break;
            case 'financas':
                this.renderFinancas();
                break;
            case 'vendas':
                this.renderVendas();
                break;
            case 'relatorios':
                this.renderRelatorios();
                break;
            case 'manual':
                this.renderManual();
                break;
            default: this.renderPainel();
        }
    }
    // --- State & Storage ---
    setState(updater) {
        this.state = updater(this.state);
        this.saveState();
        // Re-render current screen to reflect changes
        this.navigateTo(this.activeScreen);
    }
    saveState() {
        try {
            localStorage.setItem('gestor_app_state', JSON.stringify(this.state));
        }
        catch (error) {
            console.error("Failed to save state:", error);
        }
    }
    loadState() {
        try {
            const savedState = localStorage.getItem('gestor_app_state');
            return savedState ? JSON.parse(savedState) : this.getInitialState();
        }
        catch (error) {
            console.error("Failed to load state, using initial state:", error);
            return this.getInitialState();
        }
    }
    getInitialState() {
        return {
            transactions: [],
            clients: [],
            opportunities: [],
        };
    }
    // --- Render Methods ---
    render(html) {
        this.mainContent.innerHTML = html;
    }
    renderPainel() {
        const header = this.generateScreenHeader('Painel', 'Uma visão geral do seu negócio.');
        // Default to current month for monthly view
        const currentMonth = new Date().toISOString().slice(0, 7);
        const { totalBalance, totalRevenue, totalExpenses } = this.calculateTotals();
        const { monthBalance, monthRevenue, monthExpenses } = this.calculateTotals(currentMonth);
        const html = `
            ${header}
            <div class="card" style="margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4>Resumo Financeiro</h4>
                    <select id="painel-view-selector">
                        <option value="total">Visão Total</option>
                        <option value="monthly" selected>Visão Mensal</option>
                    </select>
                </div>
            </div>

            <div id="painel-stats">
                 <!-- Stats will be rendered here -->
            </div>
        `;
        this.render(html);
        this.renderPainelStats('monthly'); // Initial render
        document.getElementById('painel-view-selector')?.addEventListener('change', (e) => {
            this.renderPainelStats(e.target.value);
        });
    }
    renderPainelStats(view, month = new Date().toISOString().slice(0, 7)) {
        const statsContainer = document.getElementById('painel-stats');
        let balance = 0, revenue = 0, expenses = 0;
        let monthSelectorHtml = '';
        if (view === 'total') {
            const totals = this.calculateTotals();
            balance = totals.totalBalance;
            revenue = totals.totalRevenue;
            expenses = totals.totalExpenses;
        }
        else {
            const totals = this.calculateTotals(month);
            balance = totals.monthBalance;
            revenue = totals.monthRevenue;
            expenses = totals.monthExpenses;
            monthSelectorHtml = `
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label for="painel-month-selector">Selecionar Mês:</label>
                    <input type="month" id="painel-month-selector" value="${month}" class="form-control">
                </div>
            `;
        }
        statsContainer.innerHTML = `
            ${monthSelectorHtml}
            <div class="dashboard-grid">
                <div class="card stat-card">
                    <h3>Saldo</h3>
                    <p class="amount">${this.formatCurrency(balance)}</p>
                </div>
                <div class="card stat-card">
                    <h3>Receitas</h3>
                    <p class="amount text-receita">${this.formatCurrency(revenue)}</p>
                </div>
                <div class="card stat-card">
                    <h3>Despesas</h3>
                    <p class="amount text-despesa">${this.formatCurrency(expenses)}</p>
                </div>
            </div>
        `;
        document.getElementById('painel-month-selector')?.addEventListener('change', (e) => {
            const selectedMonth = e.target.value;
            this.renderPainelStats('monthly', selectedMonth);
        });
    }
    renderFinancas() {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const header = this.generateScreenHeader('Finanças', 'Gerencie suas receitas e despesas.');
        const formTitle = this.editingTransactionId ? 'Editar Transação' : 'Adicionar Transação';
        const editingTx = this.editingTransactionId ? this.state.transactions.find(t => t.id === this.editingTransactionId) : null;
        const html = `
            ${header}
            <div class="card" style="margin-bottom: 1.5rem;">
                <div class="form-group">
                    <label for="financas-month-selector">Selecionar Mês:</label>
                    <input type="month" id="financas-month-selector" value="${currentMonth}">
                </div>
                <div id="financas-summary" class="dashboard-grid"></div>
            </div>

            <div class="card" style="margin-bottom: 1.5rem;">
                <h3 id="tx-form-title">${formTitle}</h3>
                <form id="transaction-form">
                    <div class="form-group">
                        <label for="tx-description">Descrição</label>
                        <input type="text" id="tx-description" required value="${editingTx?.description || ''}">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label for="tx-amount">Valor</label>
                            <input type="number" id="tx-amount" step="0.01" required value="${editingTx ? Math.abs(editingTx.amount) : ''}">
                        </div>
                        <div class="form-group">
                            <label for="tx-type">Tipo</label>
                            <select id="tx-type" required>
                                <option value="receita" ${editingTx?.type === 'receita' ? 'selected' : ''}>Receita</option>
                                <option value="despesa" ${editingTx?.type === 'despesa' ? 'selected' : ''}>Despesa</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="tx-date">Data</label>
                            <input type="date" id="tx-date" required value="${editingTx?.date || new Date().toISOString().slice(0, 10)}">
                        </div>
                    </div>
                    <div id="tx-form-buttons">
                        <button type="submit" class="btn btn-primary">${this.editingTransactionId ? 'Salvar Alterações' : 'Adicionar'}</button>
                        ${this.editingTransactionId ? '<button type="button" id="cancel-edit-btn" class="btn btn-secondary">Cancelar</button>' : ''}
                    </div>
                </form>
            </div>
            
            <div class="card">
                <h3>Transações do Mês</h3>
                <div id="transactions-table-container" class="table-container"></div>
            </div>
        `;
        this.render(html);
        this.updateFinancasView(currentMonth);
        document.getElementById('financas-month-selector')?.addEventListener('change', (e) => {
            this.updateFinancasView(e.target.value);
        });
        document.getElementById('transaction-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTransactionFormSubmit();
        });
        document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
            this.editingTransactionId = null;
            this.renderFinancas(); // Re-render to reset form
        });
    }
    updateFinancasView(month) {
        const { monthBalance, monthRevenue, monthExpenses } = this.calculateTotals(month);
        document.getElementById('financas-summary').innerHTML = `
            <div class="stat-card"><h3>Saldo do Mês</h3><p class="amount">${this.formatCurrency(monthBalance)}</p></div>
            <div class="stat-card"><h3>Receitas</h3><p class="amount text-receita">${this.formatCurrency(monthRevenue)}</p></div>
            <div class="stat-card"><h3>Despesas</h3><p class="amount text-despesa">${this.formatCurrency(monthExpenses)}</p></div>
        `;
        const transactions = this.state.transactions
            .filter(t => t.date.startsWith(month))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        let tableHtml = `
            <table>
                <thead><tr><th>Descrição</th><th>Valor</th><th>Data</th><th>Ações</th></tr></thead>
                <tbody>
        `;
        if (transactions.length > 0) {
            transactions.forEach(tx => {
                tableHtml += `
                    <tr>
                        <td>${tx.description}</td>
                        <td class="${tx.type === 'receita' ? 'text-receita' : 'text-despesa'}">${this.formatCurrency(tx.amount)}</td>
                        <td>${new Date(tx.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                        <td>
                            <div class="action-btns">
                                <button class="edit-tx-btn" data-id="${tx.id}" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                                <button class="delete-tx-btn" data-id="${tx.id}" title="Excluir"><i class="fa-solid fa-trash delete-btn"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }
        else {
            tableHtml += `<tr><td colspan="4" style="text-align: center;">Nenhuma transação neste mês.</td></tr>`;
        }
        tableHtml += '</tbody></table>';
        document.getElementById('transactions-table-container').innerHTML = tableHtml;
        document.querySelectorAll('.edit-tx-btn').forEach(btn => btn.addEventListener('click', e => {
            this.editingTransactionId = e.currentTarget.dataset.id;
            this.renderFinancas();
        }));
        document.querySelectorAll('.delete-tx-btn').forEach(btn => btn.addEventListener('click', e => {
            this.handleDeleteTransaction(e.currentTarget.dataset.id);
        }));
    }
    renderVendas() {
        const header = this.generateScreenHeader('Vendas', 'Acompanhe seu pipeline e gerencie clientes.');
        const html = `
            ${header}
            <div class="tabs">
                <button id="tab-pipeline" class="tab-btn ${this.activeSalesTab === 'pipeline' ? 'active' : ''}">Pipeline</button>
                <button id="tab-clientes" class="tab-btn ${this.activeSalesTab === 'clientes' ? 'active' : ''}">Clientes</button>
            </div>
            <div id="vendas-content"></div>
        `;
        this.render(html);
        document.getElementById('tab-pipeline')?.addEventListener('click', () => {
            this.activeSalesTab = 'pipeline';
            this.renderVendasContent();
        });
        document.getElementById('tab-clientes')?.addEventListener('click', () => {
            this.activeSalesTab = 'clientes';
            this.renderVendasContent();
        });
        this.renderVendasContent();
    }
    renderVendasContent() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`tab-${this.activeSalesTab}`)?.classList.add('active');
        if (this.activeSalesTab === 'pipeline') {
            this.renderPipeline();
        }
        else {
            this.renderClientes();
        }
    }
    renderPipeline() {
        const contentEl = document.getElementById('vendas-content');
        let columnsHtml = '';
        this.STAGES.forEach(stage => {
            const opportunitiesInStage = this.state.opportunities.filter(op => op.stage === stage);
            let cardsHtml = '';
            opportunitiesInStage.forEach(op => {
                const client = this.state.clients.find(c => c.id === op.clientId);
                cardsHtml += `
                    <div class="kanban-card" draggable="true" data-op-id="${op.id}">
                        <h4>${op.title}</h4>
                        <p>${this.formatCurrency(op.value)}</p>
                        <p><i class="fa-solid fa-user"></i> ${client?.name || 'Cliente não encontrado'}</p>
                        <div class="actions">
                           <button class="edit-op-btn" data-id="${op.id}"><i class="fa-solid fa-pencil"></i></button>
                           <button class="delete-op-btn" data-id="${op.id}"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `;
            });
            columnsHtml += `
                <div class="kanban-column" data-stage="${stage}">
                    <h3>${stage} (${opportunitiesInStage.length})</h3>
                    <div class="kanban-cards">${cardsHtml}</div>
                </div>
            `;
        });
        contentEl.innerHTML = `
            <div style="text-align: right; margin-bottom: 1rem;">
                <button id="add-opportunity-btn" class="btn btn-primary">Adicionar Oportunidade</button>
            </div>
            <div class="kanban-board">${columnsHtml}</div>
        `;
        this.setupPipelineDnD();
        document.getElementById('add-opportunity-btn')?.addEventListener('click', () => this.showOpportunityForm());
        document.querySelectorAll('.edit-op-btn').forEach(btn => btn.addEventListener('click', (e) => {
            this.showOpportunityForm(e.currentTarget.dataset.id);
        }));
        document.querySelectorAll('.delete-op-btn').forEach(btn => btn.addEventListener('click', (e) => {
            this.handleDeleteOpportunity(e.currentTarget.dataset.id);
        }));
    }
    renderClientes() {
        const contentEl = document.getElementById('vendas-content');
        let tableRows = '';
        this.state.clients.forEach(c => {
            tableRows += `
                <tr>
                    <td>${c.name}</td>
                    <td>${c.company}</td>
                    <td>${c.email}</td>
                    <td>${c.phone}</td>
                    <td>
                        <div class="action-btns">
                            <button class="edit-client-btn" data-id="${c.id}" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                            <button class="delete-client-btn" data-id="${c.id}" title="Excluir"><i class="fa-solid fa-trash delete-btn"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
        contentEl.innerHTML = `
            <div style="text-align: right; margin-bottom: 1rem;">
                <button id="add-client-btn" class="btn btn-primary">Adicionar Cliente</button>
            </div>
            <div class="card">
                <div class="table-container">
                    <table>
                        <thead><tr><th>Nome</th><th>Empresa</th><th>Email</th><th>Telefone</th><th>Ações</th></tr></thead>
                        <tbody>${tableRows || `<tr><td colspan="5" style="text-align: center;">Nenhum cliente cadastrado.</td></tr>`}</tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('add-client-btn')?.addEventListener('click', () => this.showClientForm());
        document.querySelectorAll('.edit-client-btn').forEach(btn => btn.addEventListener('click', (e) => {
            this.showClientForm(e.currentTarget.dataset.id);
        }));
        document.querySelectorAll('.delete-client-btn').forEach(btn => btn.addEventListener('click', (e) => {
            this.handleDeleteClient(e.currentTarget.dataset.id);
        }));
    }
    renderRelatorios() {
        const header = this.generateScreenHeader('Relatórios', 'Analise seus dados e exporte relatórios.');
        const html = `
            ${header}
            <div class="card" style="margin-bottom: 1.5rem;">
                <h3>Configuração do Relatório</h3>
                <form id="report-form" style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 1rem; align-items: end;">
                    <div class="form-group">
                        <label for="report-type">Tipo de Relatório</label>
                        <select id="report-type">
                            <option value="financeiro">Análise Financeira</option>
                            <option value="vendas">Análise de Vendas</option>
                        </select>
                    </div>
                     <div class="form-group">
                        <label for="report-start-date">Data Inicial</label>
                        <input type="date" id="report-start-date" value="${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)}">
                    </div>
                     <div class="form-group">
                        <label for="report-end-date">Data Final</label>
                        <input type="date" id="report-end-date" value="${new Date().toISOString().slice(0, 10)}">
                    </div>
                    <button type="submit" class="btn btn-primary">Gerar Relatório</button>
                </form>
            </div>
            <div id="report-results" class="card" style="display: none;">
                <h3>Resultados</h3>
                <div id="report-actions" style="text-align: right; margin-bottom: 1rem;"></div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
                    <div id="report-text-analysis"></div>
                    <div id="report-chart-container"><canvas id="report-chart"></canvas></div>
                </div>
            </div>

            <div class="danger-zone">
                <h3>Zona de Perigo</h3>
                <p>Esta ação é irreversível e irá apagar todos os dados da aplicação.</p>
                <button id="wipe-data-btn" class="btn btn-danger">Zerar Todos os Dados</button>
            </div>
        `;
        this.render(html);
        document.getElementById('report-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateReport();
        });
        document.getElementById('wipe-data-btn')?.addEventListener('click', () => this.showWipeDataConfirmation());
    }
    renderManual() {
        const header = this.generateScreenHeader('Manual do Usuário', 'Como utilizar o Gestor.');
        const html = `
            ${header}
            <div class="card">
                <h3>Painel</h3>
                <p>O Painel oferece uma visão geral e rápida da saúde financeira do seu negócio. Você pode alternar entre a "Visão Total" de todos os tempos e a "Visão Mensal" para analisar um mês específico.</p>
                
                <h3>Finanças</h3>
                <p>Nesta tela, você gerencia todas as suas transações. Adicione novas receitas e despesas, edite ou exclua transações existentes. Use o seletor de mês para focar em um período contábil.</p>

                <h3>Vendas</h3>
                <p>A seção de Vendas é dividida em duas abas:</p>
                <ul>
                    <li><strong>Pipeline:</strong> Um quadro Kanban para visualizar e gerenciar suas oportunidades de venda. Arraste e solte os cartões entre as colunas para atualizar o estágio da negociação.</li>
                    <li><strong>Clientes:</strong> Um CRM simples para manter um registro de seus clientes.</li>
                </ul>

                <h3>Relatórios</h3>
                <p>Gere relatórios detalhados sobre suas finanças ou vendas. Selecione o tipo de relatório e o período desejado. Os resultados incluem uma análise textual, um gráfico visual e opções para exportar os dados em formato PDF.</p>

                <h3>Backup e Restauração</h3>
                <p>Na parte inferior da barra lateral, você encontrará botões para "Salvar Backup" (baixa um arquivo .json com todos os seus dados) e "Carregar Backup" (restaura seus dados a partir de um arquivo .json). Faça backups regularmente!</p>
            </div>
        `;
        this.render(html);
    }
    // --- Handlers & Logic ---
    handleTransactionFormSubmit() {
        const description = document.getElementById('tx-description').value;
        const amountStr = document.getElementById('tx-amount').value;
        const type = document.getElementById('tx-type').value;
        const date = document.getElementById('tx-date').value;
        if (!description || !amountStr || !date) {
            this.showAlertModal("Por favor, preencha todos os campos.");
            return;
        }
        const amount = parseFloat(amountStr);
        const signedAmount = type === 'receita' ? amount : -amount;
        if (this.editingTransactionId) {
            // Edit
            this.setState(prev => ({
                ...prev,
                transactions: prev.transactions.map(tx => tx.id === this.editingTransactionId ? { ...tx, description, amount: signedAmount, date, type } : tx)
            }));
            this.editingTransactionId = null;
        }
        else {
            // Add
            const newTransaction = {
                id: `tx_${Date.now()}`,
                description,
                amount: signedAmount,
                date,
                type,
            };
            this.setState(prev => ({ ...prev, transactions: [...prev.transactions, newTransaction] }));
        }
        // No need to call renderFinancas() directly, setState handles it.
    }
    handleDeleteTransaction(id) {
        this.showConfirmationModal("Tem certeza que deseja excluir esta transação?", () => {
            this.setState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
        });
    }
    handleDeleteOpportunity(id) {
        this.showConfirmationModal("Tem certeza que deseja excluir esta oportunidade?", () => {
            this.setState(prev => ({ ...prev, opportunities: prev.opportunities.filter(o => o.id !== id) }));
        });
    }
    handleDeleteClient(id) {
        const clientOpportunities = this.state.opportunities.filter(op => op.clientId === id);
        if (clientOpportunities.length > 0) {
            this.showAlertModal("Não é possível excluir um cliente que possui oportunidades associadas.");
            return;
        }
        this.showConfirmationModal("Tem certeza que deseja excluir este cliente?", () => {
            this.setState(prev => ({ ...prev, clients: prev.clients.filter(c => c.id !== id) }));
        });
    }
    setupPipelineDnD() {
        const cards = document.querySelectorAll('.kanban-card');
        const columns = document.querySelectorAll('.kanban-column');
        let draggedItem = null;
        cards.forEach(card => {
            card.addEventListener('dragstart', () => {
                draggedItem = card;
                setTimeout(() => card.classList.add('dragging'), 0);
            });
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                draggedItem = null;
            });
        });
        columns.forEach(column => {
            column.addEventListener('dragover', e => {
                e.preventDefault();
            });
            column.addEventListener('drop', e => {
                e.preventDefault();
                if (draggedItem) {
                    const targetStage = column.dataset.stage;
                    const opId = draggedItem.dataset.opId;
                    this.setState(prev => ({
                        ...prev,
                        opportunities: prev.opportunities.map(op => op.id === opId ? { ...op, stage: targetStage } : op)
                    }));
                }
            });
        });
    }
    generateReport() {
        const type = document.getElementById('report-type').value;
        const startDate = document.getElementById('report-start-date').value;
        const endDate = document.getElementById('report-end-date').value;
        const resultsContainer = document.getElementById('report-results');
        const textContainer = document.getElementById('report-text-analysis');
        const chartCtx = document.getElementById('report-chart').getContext('2d');
        if (this.activeChart)
            this.activeChart.destroy();
        let chartConfig = {};
        let textAnalysis = '';
        let tableData = [];
        if (type === 'financeiro') {
            const filteredTxs = this.state.transactions.filter(t => t.date >= startDate && t.date <= endDate);
            const revenue = filteredTxs.filter(t => t.type === 'receita').reduce((sum, t) => sum + t.amount, 0);
            const expenses = filteredTxs.filter(t => t.type === 'despesa').reduce((sum, t) => sum + t.amount, 0);
            const balance = revenue + expenses;
            textAnalysis = `
### Análise Financeira (${startDate} a ${endDate})

*   **Receita Total:** ${this.formatCurrency(revenue)}
*   **Despesa Total:** ${this.formatCurrency(Math.abs(expenses))}
*   **Saldo do Período:** ${this.formatCurrency(balance)}
            `;
            chartConfig = {
                type: 'pie',
                data: {
                    labels: ['Receitas', 'Despesas'],
                    datasets: [{
                            data: [revenue, Math.abs(expenses)],
                            backgroundColor: ['#7ed321', '#d0021b'],
                        }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            };
            tableData = filteredTxs.map(t => ({ 'Descrição': t.description, 'Valor': t.amount, 'Data': t.date, 'Tipo': t.type }));
        }
        else if (type === 'vendas') {
            const wonCount = this.state.opportunities.filter(o => o.stage === 'Ganho').length;
            const lostCount = this.state.opportunities.filter(o => o.stage === 'Perdido').length;
            const totalValueWon = this.state.opportunities.filter(o => o.stage === 'Ganho').reduce((sum, o) => sum + o.value, 0);
            textAnalysis = `
### Análise de Vendas

*   **Oportunidades Ganhos:** ${wonCount}
*   **Oportunidades Perdidas:** ${lostCount}
*   **Valor Total Ganho:** ${this.formatCurrency(totalValueWon)}
            `;
            const stageCounts = this.STAGES.map(stage => this.state.opportunities.filter(o => o.stage === stage).length);
            chartConfig = {
                type: 'bar',
                data: {
                    labels: this.STAGES,
                    datasets: [{
                            label: '# de Oportunidades',
                            data: stageCounts,
                            backgroundColor: 'var(--primary-color)',
                        }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            };
            tableData = this.state.opportunities.map(o => ({ 'Título': o.title, 'Valor': o.value, 'Cliente': this.state.clients.find(c => c.id === o.clientId)?.name || 'N/A', 'Estágio': o.stage }));
        }
        textContainer.innerHTML = marked.parse(textAnalysis);
        this.activeChart = new Chart(chartCtx, chartConfig);
        resultsContainer.style.display = 'block';
        const actionsContainer = document.getElementById('report-actions');
        actionsContainer.innerHTML = `
            <button id="export-pdf" class="btn btn-secondary">Exportar PDF</button>
        `;
        document.getElementById('export-pdf')?.addEventListener('click', () => this.exportToPDF(textAnalysis, chartCtx.canvas, tableData));
    }
    // --- Modals & Forms ---
    showModal({ title, body, footer }) {
        const footerHtml = footer ? `<div class="modal-footer">${footer}</div>` : '';
        this.modalContent.innerHTML = `
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="close-modal-btn">&times;</button>
            </div>
            <div class="modal-body">
                ${body}
            </div>
            ${footerHtml}
        `;
        this.modalContainer.classList.remove('hidden');
        this.modalContent.querySelector('.close-modal-btn')?.addEventListener('click', () => this.hideModal());
        this.modalContainer.addEventListener('click', (e) => {
            if (e.target === this.modalContainer)
                this.hideModal();
        });
    }
    hideModal() {
        this.modalContainer.classList.add('hidden');
    }
    showAlertModal(message, title = 'Aviso') {
        this.showModal({
            title,
            body: `<p>${message}</p>`,
            footer: `<button id="modal-ok-btn" class="btn btn-primary">OK</button>`
        });
        document.getElementById('modal-ok-btn')?.addEventListener('click', () => this.hideModal());
    }
    showConfirmationModal(message, onConfirm, title = 'Confirmar Ação') {
        this.showModal({
            title,
            body: `<p>${message}</p>`,
            footer: `
                <button id="modal-cancel-btn" class="btn btn-secondary">Cancelar</button>
                <button id="modal-confirm-btn" class="btn btn-danger">Confirmar</button>
            `
        });
        document.getElementById('modal-cancel-btn')?.addEventListener('click', () => this.hideModal());
        document.getElementById('modal-confirm-btn')?.addEventListener('click', () => {
            this.hideModal();
            onConfirm();
        });
    }
    showOpportunityForm(id = null) {
        const op = this.state.opportunities.find(o => o.id === id);
        const clientOptions = this.state.clients.map(c => `<option value="${c.id}" ${op?.clientId === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
        const formHtml = `
            <form id="opportunity-form">
                <div class="form-group"><label for="op-title">Título</label><input type="text" id="op-title" required value="${op?.title || ''}"></div>
                <div class="form-group"><label for="op-value">Valor</label><input type="number" id="op-value" required value="${op?.value || ''}"></div>
                <div class="form-group"><label for="op-client">Cliente</label><select id="op-client" required>${clientOptions}</select></div>
                <button type="submit" class="btn btn-primary">${id ? 'Salvar' : 'Criar'}</button>
            </form>
        `;
        this.showModal({ title: id ? 'Editar Oportunidade' : 'Nova Oportunidade', body: formHtml });
        document.getElementById('opportunity-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('op-title').value;
            const value = parseFloat(document.getElementById('op-value').value);
            const clientId = document.getElementById('op-client').value;
            if (id) {
                this.setState(prev => ({ ...prev, opportunities: prev.opportunities.map(o => o.id === id ? { ...o, title, value, clientId } : o) }));
            }
            else {
                const newOp = { id: `op_${Date.now()}`, title, value, clientId, stage: 'Lead' };
                this.setState(prev => ({ ...prev, opportunities: [...prev.opportunities, newOp] }));
            }
            this.hideModal();
        });
    }
    showClientForm(id = null) {
        const client = this.state.clients.find(c => c.id === id);
        const formHtml = `
            <form id="client-form">
                <div class="form-group"><label for="client-name">Nome</label><input type="text" id="client-name" required value="${client?.name || ''}"></div>
                <div class="form-group"><label for="client-company">Empresa</label><input type="text" id="client-company" value="${client?.company || ''}"></div>
                <div class="form-group"><label for="client-email">Email</label><input type="email" id="client-email" value="${client?.email || ''}"></div>
                <div class="form-group"><label for="client-phone">Telefone</label><input type="tel" id="client-phone" value="${client?.phone || ''}"></div>
                <button type="submit" class="btn btn-primary">${id ? 'Salvar' : 'Criar'}</button>
            </form>
        `;
        this.showModal({ title: id ? 'Editar Cliente' : 'Novo Cliente', body: formHtml });
        document.getElementById('client-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('client-name').value;
            const company = document.getElementById('client-company').value;
            const email = document.getElementById('client-email').value;
            const phone = document.getElementById('client-phone').value;
            if (id) {
                this.setState(prev => ({ ...prev, clients: prev.clients.map(c => c.id === id ? { ...c, name, company, email, phone } : c) }));
            }
            else {
                const newClient = { id: `cl_${Date.now()}`, name, company, email, phone };
                this.setState(prev => ({ ...prev, clients: [...prev.clients, newClient] }));
            }
            this.hideModal();
        });
    }
    showWipeDataConfirmation() {
        const body = `
            <p>Esta ação não pode ser desfeita. Para confirmar, digite "ZERAR" no campo abaixo.</p>
            <div class="form-group">
                <input type="text" id="wipe-confirm-input" placeholder="ZERAR">
            </div>
        `;
        const footer = `<button id="confirm-wipe-btn" class="btn btn-danger" disabled>Confirmar Exclusão</button>`;
        this.showModal({ title: "Confirmar Exclusão de Dados", body, footer });
        const input = document.getElementById('wipe-confirm-input');
        const confirmBtn = document.getElementById('confirm-wipe-btn');
        input.addEventListener('input', () => {
            confirmBtn.disabled = input.value !== 'ZERAR';
        });
        confirmBtn.addEventListener('click', () => {
            this.setState(() => this.getInitialState());
            this.hideModal();
            this.showAlertModal("Todos os dados foram apagados.", "Operação Concluída");
            this.navigateTo('painel');
        });
    }
    showGlobalSearchResults(query) {
        let resultsHtml = '<ul>';
        this.state.transactions.filter(t => t.description.toLowerCase().includes(query)).forEach(t => {
            resultsHtml += `<li><strong>Transação:</strong> ${t.description} - ${this.formatCurrency(t.amount)}</li>`;
        });
        this.state.clients.filter(c => c.name.toLowerCase().includes(query) || c.company.toLowerCase().includes(query)).forEach(c => {
            resultsHtml += `<li><strong>Cliente:</strong> ${c.name} (${c.company})</li>`;
        });
        this.state.opportunities.filter(o => o.title.toLowerCase().includes(query)).forEach(o => {
            resultsHtml += `<li><strong>Oportunidade:</strong> ${o.title} - ${o.stage}</li>`;
        });
        resultsHtml += '</ul>';
        if (resultsHtml === '<ul></ul>')
            resultsHtml = '<p>Nenhum resultado encontrado.</p>';
        this.showModal({ title: `Resultados para "${query}"`, body: resultsHtml });
    }
    // --- Helpers & Utilities ---
    generateScreenHeader(title, subtitle) {
        return `<header class="screen-header"><h2>${title}</h2><p>${subtitle}</p></header>`;
    }
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }
    calculateTotals(month) {
        const transactionsToConsider = month ? this.state.transactions.filter(t => t.date.startsWith(month)) : this.state.transactions;
        const totalBalance = this.state.transactions.reduce((acc, t) => acc + t.amount, 0);
        const totalRevenue = this.state.transactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.amount, 0);
        const totalExpenses = this.state.transactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.amount, 0);
        const monthBalance = transactionsToConsider.reduce((acc, t) => acc + t.amount, 0);
        const monthRevenue = transactionsToConsider.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.amount, 0);
        const monthExpenses = transactionsToConsider.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.amount, 0);
        return { totalBalance, totalRevenue, totalExpenses, monthBalance, monthRevenue, monthExpenses };
    }
    // --- Data Export/Import ---
    saveBackup() {
        const dataStr = JSON.stringify(this.state, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gestor_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    loadBackup(event) {
        const file = event.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const newState = JSON.parse(e.target?.result);
                if ('transactions' in newState && 'clients' in newState && 'opportunities' in newState) {
                    this.showConfirmationModal("Tem certeza que deseja carregar este backup? Todos os dados atuais serão substituídos.", () => {
                        this.state = newState;
                        this.saveState();
                        this.showAlertModal("Backup carregado com sucesso!", "Sucesso");
                        this.navigateTo('painel');
                    });
                }
                else {
                    this.showAlertModal("Arquivo de backup inválido.", "Erro");
                }
            }
            catch (error) {
                this.showAlertModal("Erro ao ler o arquivo de backup.", "Erro");
            }
        };
        reader.readAsText(file);
    }
    async exportToPDF(textAnalysis, chartCanvas, tableData) {
        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Relatório - Gestor", 14, 22);
        doc.setFontSize(12);
        // This is a simplified way to render markdown-like text. A more complex parser would be needed for full support.
        const cleanedText = textAnalysis.replace(/###/g, '').replace(/\*/g, '').split('\n').filter(line => line.trim() !== '');
        let yPos = 35;
        cleanedText.forEach(line => {
            doc.text(line.trim(), 14, yPos);
            yPos += 7;
        });
        const chartImage = chartCanvas.toDataURL('image/png');
        doc.addImage(chartImage, 'PNG', 14, yPos, 180, 100);
        yPos += 110;
        if (tableData.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [Object.keys(tableData[0])],
                body: tableData.map(row => Object.values(row)),
            });
        }
        doc.save('relatorio_gestor.pdf');
    }
}
document.addEventListener('DOMContentLoaded', () => {
    new GestorApp();
});
export {};