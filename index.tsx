/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Definições de tipo para bibliotecas externas, permitindo que o TypeScript as reconheça.
declare const marked: {
    parse(markdown: string): string;
};
declare const jspdf: any;
declare const Chart: any;

// --- Modelos de Dados (Interfaces) ---

/**
 * Representa uma transação financeira.
 */
interface Transaction {
    id: string; // Identificador único
    description: string; // Descrição da transação
    amount: number; // Valor (positivo para receita, negativo para despesa)
    date: string; // Data no formato YYYY-MM-DD
    type: 'receita' | 'despesa'; // Tipo da transação
}

/**
 * Representa um cliente.
 */
interface Client {
    id: string; // Identificador único
    name: string; // Nome do cliente
    company: string; // Empresa do cliente
    email: string; // Email de contato
    phone: string; // Telefone de contato
}

/**
 * Define os possíveis estágios de uma oportunidade de venda no pipeline.
 */
type OpportunityStage = 'Lead' | 'Proposta' | 'Negociação' | 'Ganho' | 'Perdido';

/**
 * Representa uma oportunidade de venda.
 */
interface Opportunity {
    id: string; // Identificador único
    title: string; // Título da oportunidade
    value: number; // Valor estimado do negócio
    clientId: string; // ID do cliente associado
    stage: OpportunityStage; // Estágio atual no pipeline
}

/**
 * Define a estrutura completa do estado da aplicação.
 */
interface AppState {
    transactions: Transaction[];
    clients: Client[];
    opportunities: Opportunity[];
}

/**
 * Representa um snapshot (cópia de segurança) do estado da aplicação.
 */
interface Snapshot {
    id: string;
    name: string;
    timestamp: number;
    data: AppState;
}

/**
 * Classe principal que gerencia toda a lógica da aplicação Gestor.
 * Controla o estado, a renderização da UI e a interação do usuário.
 */
class GestorApp {
    // Armazena o estado atual da aplicação (transações, clientes, etc.)
    private state: AppState;
    // Armazena todos os snapshots salvos.
    private snapshots: Snapshot[] = [];
    // Identifica a tela atualmente ativa (ex: 'painel', 'financas')
    private activeScreen: string = 'painel';
    // Controla a aba ativa na tela de Vendas ('pipeline' ou 'clientes')
    private activeSalesTab: 'pipeline' | 'clientes' = 'pipeline';
    // Armazena o ID da transação que está sendo editada, ou null se nenhuma estiver.
    private editingTransactionId: string | null = null;
    // Armazena a instância do gráfico ativo (Chart.js) para que possa ser destruído.
    private activeChart: any | null = null;

    // Constante com os estágios do pipeline de vendas para garantir consistência.
    private readonly STAGES: OpportunityStage[] = ['Lead', 'Proposta', 'Negociação', 'Ganho', 'Perdido'];

    // --- Elementos do DOM ---
    private sidebar: HTMLElement;
    private mainContent: HTMLElement;
    private modalContainer: HTMLElement;
    private modalContent: HTMLElement;

    /**
     * Construtor da classe GestorApp.
     * Inicializa os elementos do DOM, carrega o estado salvo e inicia a aplicação.
     */
    constructor() {
        this.sidebar = document.getElementById('sidebar')!;
        this.mainContent = document.getElementById('main-content')!;
        this.modalContainer = document.getElementById('modal-container')!;
        this.modalContent = document.getElementById('modal-content')!;

        // Carrega o estado e os snapshots do Local Storage.
        this.state = this.loadState();
        this.snapshots = this.loadSnapshots();
        // Inicia a aplicação.
        this.init();
    }

    // --- Métodos Principais (Core) ---

    /**
     * Inicia a aplicação, configura os ouvintes de eventos e navega para a tela inicial.
     */
    private init(): void {
        this.setupEventListeners();
        this.navigateTo(this.activeScreen);
    }

    /**
     * Configura todos os ouvintes de eventos globais (navegação, backup, busca, etc.).
     */
    private setupEventListeners(): void {
        // Navegação pela barra lateral.
        this.sidebar.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const navBtn = target.closest('.nav-btn');
            if (navBtn) {
                const screen = navBtn.getAttribute('data-screen');
                if (screen) this.navigateTo(screen);
            }
        });

        // Ações de Backup e Restauração.
        document.getElementById('save-backup-btn')?.addEventListener('click', () => this.saveBackup());
        document.getElementById('load-backup-btn')?.addEventListener('click', () => document.getElementById('backup-file-input')?.click());
        document.getElementById('backup-file-input')?.addEventListener('change', (e) => this.loadBackup(e));
    
        // Busca Global (simplificada).
        document.getElementById('global-search')?.addEventListener('input', (e) => {
            const query = (e.target as HTMLInputElement).value.toLowerCase();
            // A busca só é acionada com mais de 2 caracteres para evitar sobrecarga.
            if (query.length > 2) {
                this.showGlobalSearchResults(query);
            }
        });
    }

    /**
     * Gerencia a navegação para uma tela específica.
     * @param screen - O identificador da tela para a qual navegar.
     */
    private navigateTo(screen: string): void {
        this.activeScreen = screen;
        
        // Atualiza o estilo do botão ativo na barra lateral.
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.nav-btn[data-screen="${screen}"]`)?.classList.add('active');

        // Garante que qualquer gráfico da tela anterior seja destruído para evitar conflitos.
        if (this.activeChart) {
            this.activeChart.destroy();
            this.activeChart = null;
        }

        // Renderiza o conteúdo da tela selecionada.
        switch (screen) {
            case 'painel': this.renderPainel(); break;
            case 'financas': this.renderFinancas(); break;
            case 'vendas': this.renderVendas(); break;
            case 'relatorios': this.renderRelatorios(); break;
            case 'historico': this.renderHistorico(); break;
            case 'manual': this.renderManual(); break;
            default: this.renderPainel(); // Tela padrão
        }
    }

    // --- Gerenciamento de Estado e Armazenamento ---

    /**
     * Atualiza o estado da aplicação de forma segura.
     * @param updater - Uma função que recebe o estado anterior e retorna o novo estado.
     */
    private setState(updater: (prevState: AppState) => AppState): void {
        this.state = updater(this.state);
        this.saveState();
        // Re-renderiza a tela atual para refletir as mudanças no estado.
        this.navigateTo(this.activeScreen);
    }

    /**
     * Salva o estado atual no Local Storage do navegador.
     */
    private saveState(): void {
        try {
            localStorage.setItem('gestor_app_state', JSON.stringify(this.state));
        } catch (error) {
            console.error("Falha ao salvar o estado:", error);
        }
    }

    /**
     * Carrega o estado do Local Storage ou retorna o estado inicial se não houver dados salvos.
     * @returns O estado da aplicação.
     */
    private loadState(): AppState {
        try {
            const savedState = localStorage.getItem('gestor_app_state');
            return savedState ? JSON.parse(savedState) : this.getInitialState();
        } catch (error) {
            console.error("Falha ao carregar o estado, usando o estado inicial:", error);
            return this.getInitialState();
        }
    }

    /**
     * Salva os snapshots no Local Storage.
     */
    private saveSnapshots(): void {
        try {
            localStorage.setItem('gestor_app_snapshots', JSON.stringify(this.snapshots));
        } catch (error) {
            console.error("Falha ao salvar os snapshots:", error);
        }
    }
    
    /**
     * Carrega os snapshots do Local Storage.
     * @returns Um array de snapshots.
     */
    private loadSnapshots(): Snapshot[] {
        try {
            const savedSnapshots = localStorage.getItem('gestor_app_snapshots');
            return savedSnapshots ? JSON.parse(savedSnapshots) : [];
        } catch (error) {
            console.error("Falha ao carregar os snapshots, usando array vazio:", error);
            return [];
        }
    }

    /**
     * Retorna o estado padrão (vazio) para a aplicação.
     * @returns Um objeto AppState inicial.
     */
    private getInitialState(): AppState {
        return {
            transactions: [],
            clients: [],
            opportunities: [],
        };
    }

    // --- Métodos de Renderização ---

    /**
     * Renderiza o conteúdo HTML no elemento principal da página.
     * @param html - A string HTML a ser renderizada.
     */
    private render(html: string): void {
        this.mainContent.innerHTML = html;
    }

    /**
     * Renderiza a tela do Painel (Dashboard).
     */
    private renderPainel(): void {
        const header = this.generateScreenHeader('Painel', 'Uma visão geral do seu negócio.');
        
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
                 <!-- As estatísticas serão renderizadas aqui -->
            </div>
        `;
        this.render(html);
        // Renderiza as estatísticas mensais por padrão.
        this.renderPainelStats('monthly');
        // Adiciona o ouvinte para o seletor de visão (Total vs. Mensal).
        document.getElementById('painel-view-selector')?.addEventListener('change', (e) => {
            this.renderPainelStats((e.target as HTMLSelectElement).value);
        });
    }

    /**
     * Renderiza os cards de estatísticas no Painel com base na visão selecionada.
     * @param view - 'total' ou 'monthly'.
     * @param month - O mês a ser exibido na visão mensal (formato YYYY-MM).
     */
    private renderPainelStats(view: string, month: string = new Date().toISOString().slice(0, 7)): void {
        const statsContainer = document.getElementById('painel-stats')!;
        let balance = 0, revenue = 0, expenses = 0;
        let monthSelectorHtml = '';

        if (view === 'total') {
            const totals = this.calculateTotals();
            balance = totals.totalBalance;
            revenue = totals.totalRevenue;
            expenses = totals.totalExpenses;
        } else { // 'monthly'
            const totals = this.calculateTotals(month);
            balance = totals.monthBalance;
            revenue = totals.monthRevenue;
            expenses = totals.monthExpenses;

            // Adiciona o seletor de mês apenas na visão mensal.
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

        // Adiciona o ouvinte para o seletor de mês, caso exista.
        document.getElementById('painel-month-selector')?.addEventListener('change', (e) => {
            const selectedMonth = (e.target as HTMLInputElement).value;
            this.renderPainelStats('monthly', selectedMonth);
        });
    }

    /**
     * Renderiza a tela de Finanças.
     */
    private renderFinancas(): void {
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
        // Atualiza o resumo e a tabela com os dados do mês atual.
        this.updateFinancasView(currentMonth);

        // Configura os ouvintes de eventos para a tela de Finanças.
        document.getElementById('financas-month-selector')?.addEventListener('change', (e) => {
            this.updateFinancasView((e.target as HTMLInputElement).value);
        });

        document.getElementById('transaction-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTransactionFormSubmit();
        });
        document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
            this.editingTransactionId = null;
            this.renderFinancas(); // Re-renderiza a tela para limpar o formulário.
        });
    }

    /**
     * Atualiza o resumo financeiro e a tabela de transações para um mês específico.
     * @param month - O mês a ser exibido (formato YYYY-MM).
     */
    private updateFinancasView(month: string): void {
        const { monthBalance, monthRevenue, monthExpenses } = this.calculateTotals(month);
        document.getElementById('financas-summary')!.innerHTML = `
            <div class="stat-card"><h3>Saldo do Mês</h3><p class="amount">${this.formatCurrency(monthBalance)}</p></div>
            <div class="stat-card"><h3>Receitas</h3><p class="amount text-receita">${this.formatCurrency(monthRevenue)}</p></div>
            <div class="stat-card"><h3>Despesas</h3><p class="amount text-despesa">${this.formatCurrency(monthExpenses)}</p></div>
        `;
        
        const transactions = this.state.transactions
            .filter(t => t.date.startsWith(month)) // Filtra pelo mês
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Ordena pela data mais recente

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
                        <td>${new Date(tx.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                        <td>
                            <div class="action-btns">
                                <button class="edit-tx-btn" data-id="${tx.id}" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                                <button class="delete-tx-btn" data-id="${tx.id}" title="Excluir"><i class="fa-solid fa-trash delete-btn"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        } else {
            tableHtml += `<tr><td colspan="4" style="text-align: center;">Nenhuma transação neste mês.</td></tr>`;
        }
        tableHtml += '</tbody></table>';
        document.getElementById('transactions-table-container')!.innerHTML = tableHtml;
        
        // Adiciona ouvintes para os botões de editar e excluir de cada transação.
        document.querySelectorAll('.edit-tx-btn').forEach(btn => btn.addEventListener('click', e => {
            this.editingTransactionId = (e.currentTarget as HTMLElement).dataset.id!;
            this.renderFinancas(); // Re-renderiza para preencher o formulário
        }));
        document.querySelectorAll('.delete-tx-btn').forEach(btn => btn.addEventListener('click', e => {
            this.handleDeleteTransaction((e.currentTarget as HTMLElement).dataset.id!);
        }));
    }

    /**
     * Renderiza a tela de Vendas.
     */
    private renderVendas(): void {
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

        // Adiciona ouvintes para as abas.
        document.getElementById('tab-pipeline')?.addEventListener('click', () => {
            this.activeSalesTab = 'pipeline';
            this.renderVendasContent();
        });
        document.getElementById('tab-clientes')?.addEventListener('click', () => {
            this.activeSalesTab = 'clientes';
            this.renderVendasContent();
        });

        // Renderiza o conteúdo da aba ativa.
        this.renderVendasContent();
    }

    /**
     * Renderiza o conteúdo da aba selecionada na tela de Vendas (Pipeline ou Clientes).
     */
    private renderVendasContent(): void {
        // Atualiza o estilo da aba ativa.
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`tab-${this.activeSalesTab}`)?.classList.add('active');
        
        if (this.activeSalesTab === 'pipeline') {
            this.renderPipeline();
        } else {
            this.renderClientes();
        }
    }

    /**
     * Renderiza o quadro Kanban do pipeline de vendas.
     */
    private renderPipeline(): void {
        const contentEl = document.getElementById('vendas-content')!;
        
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
        
        // Ativa a funcionalidade de arrastar e soltar.
        this.setupPipelineDnD();

        // Adiciona ouvintes para os botões.
        document.getElementById('add-opportunity-btn')?.addEventListener('click', () => this.showOpportunityForm());
        document.querySelectorAll('.edit-op-btn').forEach(btn => btn.addEventListener('click', (e) => {
            this.showOpportunityForm((e.currentTarget as HTMLElement).dataset.id);
        }));
         document.querySelectorAll('.delete-op-btn').forEach(btn => btn.addEventListener('click', (e) => {
            this.handleDeleteOpportunity((e.currentTarget as HTMLElement).dataset.id!);
        }));
    }
    
    /**
     * Renderiza a lista de clientes.
     */
    private renderClientes(): void {
        const contentEl = document.getElementById('vendas-content')!;
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

        // Adiciona ouvintes para os botões.
        document.getElementById('add-client-btn')?.addEventListener('click', () => this.showClientForm());
        document.querySelectorAll('.edit-client-btn').forEach(btn => btn.addEventListener('click', (e) => {
            this.showClientForm((e.currentTarget as HTMLElement).dataset.id);
        }));
        document.querySelectorAll('.delete-client-btn').forEach(btn => btn.addEventListener('click', (e) => {
            this.handleDeleteClient((e.currentTarget as HTMLElement).dataset.id!);
        }));
    }

    /**
     * Renderiza a tela de Relatórios.
     */
    private renderRelatorios(): void {
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
        
        // Adiciona ouvintes de eventos para o formulário de relatório e o botão de zerar dados.
        document.getElementById('report-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateReport();
        });
        document.getElementById('wipe-data-btn')?.addEventListener('click', () => this.showWipeDataConfirmation());
    }

    /**
     * Renderiza a tela de Histórico (Snapshots).
     */
    private renderHistorico(): void {
        const header = this.generateScreenHeader('Histórico de Snapshots', 'Salve e restaure versões dos seus dados a qualquer momento.');
        
        let snapshotsHtml = '';
        if (this.snapshots.length > 0) {
            // Ordena do mais novo para o mais antigo
            const sortedSnapshots = [...this.snapshots].sort((a, b) => b.timestamp - a.timestamp);
            sortedSnapshots.forEach(snap => {
                snapshotsHtml += `
                    <div class="snapshot-item">
                        <div class="snapshot-info">
                            <strong>${this.escapeHtml(snap.name)}</strong>
                            <span>${new Date(snap.timestamp).toLocaleString('pt-BR')}</span>
                        </div>
                        <div class="action-btns">
                            <button class="restore-snapshot-btn" data-id="${snap.id}" title="Restaurar"><i class="fa-solid fa-clock-rotate-left"></i></button>
                            <button class="delete-snapshot-btn" data-id="${snap.id}" title="Excluir"><i class="fa-solid fa-trash delete-btn"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            snapshotsHtml = '<p style="text-align: center; margin-top: 1rem;">Nenhum snapshot salvo ainda.</p>';
        }

        const html = `
            ${header}
            <div class="card" style="margin-bottom: 1.5rem;">
                <h3>Criar Novo Snapshot</h3>
                <p>Dê um nome descritivo para o estado atual dos seus dados. Isso salvará uma cópia de tudo (transações, clientes, oportunidades).</p>
                <form id="create-snapshot-form" style="display: flex; gap: 1rem; align-items: flex-end; margin-top: 1rem;">
                    <div class="form-group" style="flex-grow: 1; margin-bottom: 0;">
                        <label for="snapshot-name">Nome do Snapshot</label>
                        <input type="text" id="snapshot-name" required placeholder="Ex: Fechamento de Maio 2024">
                    </div>
                    <button type="submit" class="btn btn-primary">Salvar Snapshot</button>
                </form>
            </div>

            <div class="card">
                <h3>Snapshots Salvos</h3>
                <div class="snapshots-list">
                    ${snapshotsHtml}
                </div>
            </div>
        `;
        this.render(html);

        document.getElementById('create-snapshot-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateSnapshot();
        });

        document.querySelectorAll('.restore-snapshot-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLElement).dataset.id!;
                this.handleRestoreSnapshot(id);
            });
        });

        document.querySelectorAll('.delete-snapshot-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLElement).dataset.id!;
                this.handleDeleteSnapshot(id);
            });
        });
    }

    /**
     * Renderiza a tela do Manual do Usuário.
     */
    private renderManual(): void {
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

                <h3>Histórico (Snapshots)</h3>
                <p>Nesta tela, você pode criar "snapshots", que são cópias de segurança de todos os seus dados em um ponto no tempo. Dê um nome ao snapshot e salve. Mais tarde, você pode restaurar seus dados para o estado exato de quando o snapshot foi salvo. Isso é útil para criar pontos de restauração antes de fazer grandes mudanças.</p>

                <h3>Backup e Restauração</h3>
                <p>Na parte inferior da barra lateral, você encontrará botões para "Salvar Backup" (baixa um arquivo .json com todos os seus dados) e "Carregar Backup" (restaura seus dados a partir de um arquivo .json). Faça backups regularmente!</p>
            </div>
        `;
        this.render(html);
    }
    
    // --- Lógica e Manipuladores de Eventos (Handlers) ---

    /**
     * Gerencia o envio do formulário de nova/edição de transação.
     */
    private handleTransactionFormSubmit(): void {
        const description = (document.getElementById('tx-description') as HTMLInputElement).value;
        const amountStr = (document.getElementById('tx-amount') as HTMLInputElement).value;
        const type = (document.getElementById('tx-type') as HTMLSelectElement).value as 'receita' | 'despesa';
        const date = (document.getElementById('tx-date') as HTMLInputElement).value;

        // Validação simples dos campos.
        if (!description || !amountStr || !date) {
            this.showAlertModal("Por favor, preencha todos os campos.");
            return;
        }

        const amount = parseFloat(amountStr);
        // Garante que o valor seja negativo para despesas.
        const signedAmount = type === 'receita' ? amount : -amount;

        if (this.editingTransactionId) {
            // Edita a transação existente.
            this.setState(prev => ({
                ...prev,
                transactions: prev.transactions.map(tx => 
                    tx.id === this.editingTransactionId ? { ...tx, description, amount: signedAmount, date, type } : tx
                )
            }));
            this.editingTransactionId = null; // Limpa o ID de edição.
        } else {
            // Adiciona uma nova transação.
            const newTransaction: Transaction = {
                id: `tx_${Date.now()}`,
                description,
                amount: signedAmount,
                date,
                type,
            };
            this.setState(prev => ({ ...prev, transactions: [...prev.transactions, newTransaction] }));
        }
        // O `setState` já chama `navigateTo` que re-renderiza a tela, limpando o formulário implicitamente.
    }

    /**
     * Lida com a exclusão de uma transação após confirmação.
     * @param id - O ID da transação a ser excluída.
     */
    private handleDeleteTransaction(id: string): void {
        this.showConfirmationModal("Tem certeza que deseja excluir esta transação?", () => {
            this.setState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
        });
    }
    
    /**
     * Lida com a exclusão de uma oportunidade após confirmação.
     * @param id - O ID da oportunidade a ser excluída.
     */
    private handleDeleteOpportunity(id: string): void {
        this.showConfirmationModal("Tem certeza que deseja excluir esta oportunidade?", () => {
            this.setState(prev => ({ ...prev, opportunities: prev.opportunities.filter(o => o.id !== id) }));
        });
    }

    /**
     * Lida com a exclusão de um cliente após confirmação e verificação de dependências.
     * @param id - O ID do cliente a ser excluído.
     */
    private handleDeleteClient(id: string): void {
        // Verifica se o cliente tem oportunidades associadas antes de excluir.
        const clientOpportunities = this.state.opportunities.filter(op => op.clientId === id);
        if (clientOpportunities.length > 0) {
            this.showAlertModal("Não é possível excluir um cliente que possui oportunidades associadas.");
            return;
        }
        this.showConfirmationModal("Tem certeza que deseja excluir este cliente?", () => {
            this.setState(prev => ({ ...prev, clients: prev.clients.filter(c => c.id !== id) }));
        });
    }

    /**
     * Lida com a criação de um novo snapshot.
     */
    private handleCreateSnapshot(): void {
        const nameInput = document.getElementById('snapshot-name') as HTMLInputElement;
        const name = nameInput.value.trim();
        if (!name) {
            this.showAlertModal("Por favor, insira um nome para o snapshot.");
            return;
        }
    
        const newSnapshot: Snapshot = {
            id: `snap_${Date.now()}`,
            name: name,
            timestamp: Date.now(),
            data: JSON.parse(JSON.stringify(this.state)) // Cópia profunda do estado atual
        };
    
        this.snapshots.push(newSnapshot);
        this.saveSnapshots();
        this.showAlertModal("Snapshot criado com sucesso!", "Sucesso");
        this.renderHistorico(); // Re-renderiza a tela
    }

    /**
     * Lida com a restauração de um snapshot.
     * @param id - O ID do snapshot a ser restaurado.
     */
    private handleRestoreSnapshot(id: string): void {
        const snapshot = this.snapshots.find(s => s.id === id);
        if (!snapshot) return;
    
        this.showConfirmationModal(
            `Tem certeza que deseja restaurar o snapshot "${this.escapeHtml(snapshot.name)}"? Todos os dados atuais não salvos em outro snapshot serão perdidos.`,
            () => {
                this.state = JSON.parse(JSON.stringify(snapshot.data)); // Cópia profunda
                this.saveState();
                this.showAlertModal("Dados restaurados com sucesso!", "Sucesso");
                this.navigateTo('painel'); // Navega para o painel para ver o estado restaurado.
            },
            "Confirmar Restauração"
        );
    }

    /**
     * Lida com a exclusão de um snapshot.
     * @param id - O ID do snapshot a ser excluído.
     */
    private handleDeleteSnapshot(id: string): void {
        const snapshot = this.snapshots.find(s => s.id === id);
        if (!snapshot) return;
        
        this.showConfirmationModal(
            `Tem certeza que deseja excluir permanentemente o snapshot "${this.escapeHtml(snapshot.name)}"?`,
            () => {
                this.snapshots = this.snapshots.filter(s => s.id !== id);
                this.saveSnapshots();
                this.showAlertModal("Snapshot excluído.", "Sucesso");
                this.renderHistorico();
            }
        );
    }

    /**
     * Configura a funcionalidade de arrastar e soltar (Drag and Drop) para o quadro Kanban.
     */
    private setupPipelineDnD(): void {
        const cards = document.querySelectorAll('.kanban-card');
        const columns = document.querySelectorAll('.kanban-column');
        let draggedItem: HTMLElement | null = null;

        cards.forEach(card => {
            card.addEventListener('dragstart', () => {
                draggedItem = card as HTMLElement;
                // Adiciona uma classe para estilização enquanto o card é arrastado.
                setTimeout(() => card.classList.add('dragging'), 0);
            });
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                draggedItem = null;
            });
        });

        columns.forEach(column => {
            column.addEventListener('dragover', e => {
                e.preventDefault(); // Necessário para permitir o 'drop'.
            });
            column.addEventListener('drop', e => {
                e.preventDefault();
                if (draggedItem) {
                    const targetStage = (column as HTMLElement).dataset.stage as OpportunityStage;
                    const opId = draggedItem.dataset.opId!;
                    // Atualiza o estado da oportunidade para o novo estágio.
                    this.setState(prev => ({
                        ...prev,
                        opportunities: prev.opportunities.map(op => 
                            op.id === opId ? { ...op, stage: targetStage } : op
                        )
                    }));
                }
            });
        });
    }

    /**
     * Gera e exibe um relatório com base nos filtros selecionados pelo usuário.
     */
    private generateReport(): void {
        const type = (document.getElementById('report-type') as HTMLSelectElement).value;
        const startDate = (document.getElementById('report-start-date') as HTMLInputElement).value;
        const endDate = (document.getElementById('report-end-date') as HTMLInputElement).value;
        
        const resultsContainer = document.getElementById('report-results')!;
        const textContainer = document.getElementById('report-text-analysis')!;
        const chartCtx = (document.getElementById('report-chart') as HTMLCanvasElement).getContext('2d')!;

        // Destrói o gráfico anterior, se houver.
        if (this.activeChart) this.activeChart.destroy();
        
        let chartConfig: any = {};
        let textAnalysis = '';
        let tableData: any[] = []; // Dados para exportação em PDF.

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
            tableData = filteredTxs.map(t => ({'Descrição': t.description, 'Valor': t.amount, 'Data': t.date, 'Tipo': t.type}));

        } else if (type === 'vendas') {
            // Nota: Relatório de vendas não filtra por data nesta versão.
            const wonCount = this.state.opportunities.filter(o => o.stage === 'Ganho').length;
            const lostCount = this.state.opportunities.filter(o => o.stage === 'Perdido').length;
            const totalValueWon = this.state.opportunities.filter(o=>o.stage ==='Ganho').reduce((sum,o) => sum + o.value, 0);
            
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
            tableData = this.state.opportunities.map(o => ({'Título': o.title, 'Valor': o.value, 'Cliente': this.state.clients.find(c=>c.id === o.clientId)?.name || 'N/A', 'Estágio': o.stage}));
        }

        textContainer.innerHTML = marked.parse(textAnalysis);
        this.activeChart = new Chart(chartCtx, chartConfig);
        resultsContainer.style.display = 'block';

        // Adiciona o botão de exportação.
        const actionsContainer = document.getElementById('report-actions')!;
        actionsContainer.innerHTML = `
            <button id="export-pdf" class="btn btn-secondary">Exportar PDF</button>
        `;
        document.getElementById('export-pdf')?.addEventListener('click', () => this.exportToPDF(textAnalysis, chartCtx.canvas, tableData));
    }
    
    // --- Modais e Formulários ---

    /**
     * Exibe um modal genérico com título, corpo e rodapé customizáveis.
     * @param options - Objeto com `title`, `body` e `footer` (opcional).
     */
    private showModal({ title, body, footer }: { title: string, body: string, footer?: string }): void {
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
        // Adiciona ouvintes para fechar o modal.
        this.modalContent.querySelector('.close-modal-btn')?.addEventListener('click', () => this.hideModal());
        this.modalContainer.addEventListener('click', (e) => {
            if (e.target === this.modalContainer) this.hideModal();
        });
    }

    /**
     * Esconde o modal.
     */
    private hideModal(): void {
        this.modalContainer.classList.add('hidden');
    }

    /**
     * Exibe um modal de alerta simples com uma mensagem e um botão "OK".
     * @param message - A mensagem a ser exibida.
     * @param title - O título do modal.
     */
    private showAlertModal(message: string, title: string = 'Aviso'): void {
        this.showModal({
            title,
            body: `<p>${message}</p>`,
            footer: `<button id="modal-ok-btn" class="btn btn-primary">OK</button>`
        });
        document.getElementById('modal-ok-btn')?.addEventListener('click', () => this.hideModal());
    }

    /**
     * Exibe um modal de confirmação com botões "Confirmar" e "Cancelar".
     * @param message - A pergunta de confirmação.
     * @param onConfirm - A função a ser executada se o usuário confirmar.
     * @param title - O título do modal.
     */
    private showConfirmationModal(message: string, onConfirm: () => void, title: string = 'Confirmar Ação'): void {
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

    /**
     * Exibe o formulário para adicionar ou editar uma oportunidade.
     * @param id - O ID da oportunidade a ser editada, ou null para criar uma nova.
     */
    private showOpportunityForm(id: string | null = null): void {
        const op = this.state.opportunities.find(o => o.id === id);
        const clientOptions = this.state.clients.map(c => `<option value="${c.id}" ${op?.clientId === c.id ? 'selected': ''}>${c.name}</option>`).join('');

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
            const title = (document.getElementById('op-title') as HTMLInputElement).value;
            const value = parseFloat((document.getElementById('op-value') as HTMLInputElement).value);
            const clientId = (document.getElementById('op-client') as HTMLSelectElement).value;

            if (id) { // Edição
                this.setState(prev => ({ ...prev, opportunities: prev.opportunities.map(o => o.id === id ? {...o, title, value, clientId} : o)}));
            } else { // Criação
                const newOp: Opportunity = { id: `op_${Date.now()}`, title, value, clientId, stage: 'Lead'};
                this.setState(prev => ({...prev, opportunities: [...prev.opportunities, newOp]}));
            }
            this.hideModal();
        });
    }
    
    /**
     * Exibe o formulário para adicionar ou editar um cliente.
     * @param id - O ID do cliente a ser editado, ou null para criar um novo.
     */
    private showClientForm(id: string | null = null): void {
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
            const name = (document.getElementById('client-name') as HTMLInputElement).value;
            const company = (document.getElementById('client-company') as HTMLInputElement).value;
            const email = (document.getElementById('client-email') as HTMLInputElement).value;
            const phone = (document.getElementById('client-phone') as HTMLInputElement).value;
            if (id) { // Edição
                this.setState(prev => ({ ...prev, clients: prev.clients.map(c => c.id === id ? {...c, name, company, email, phone} : c)}));
            } else { // Criação
                const newClient: Client = { id: `cl_${Date.now()}`, name, company, email, phone};
                this.setState(prev => ({...prev, clients: [...prev.clients, newClient]}));
            }
            this.hideModal();
        });
    }
    
    /**
     * Exibe o modal de confirmação para zerar todos os dados da aplicação.
     */
    private showWipeDataConfirmation(): void {
        const body = `
            <p>Esta ação não pode ser desfeita. Para confirmar, digite "ZERAR" no campo abaixo.</p>
            <div class="form-group">
                <input type="text" id="wipe-confirm-input" placeholder="ZERAR">
            </div>
        `;
        const footer = `<button id="confirm-wipe-btn" class="btn btn-danger" disabled>Confirmar Exclusão</button>`;
        this.showModal({ title: "Confirmar Exclusão de Dados", body, footer });

        const input = document.getElementById('wipe-confirm-input') as HTMLInputElement;
        const confirmBtn = document.getElementById('confirm-wipe-btn') as HTMLButtonElement;

        // Habilita o botão de confirmação apenas se o texto correto for digitado.
        input.addEventListener('input', () => {
            confirmBtn.disabled = input.value !== 'ZERAR';
        });

        confirmBtn.addEventListener('click', () => {
            // Reseta o estado e os snapshots
            this.state = this.getInitialState();
            this.saveState();
            this.snapshots = [];
            this.saveSnapshots();

            this.hideModal();
            this.showAlertModal("Todos os dados foram apagados.", "Operação Concluída");
            this.navigateTo('painel');
        });
    }

    /**
     * Exibe um modal com os resultados da busca global.
     * @param query - O termo de busca.
     */
    private showGlobalSearchResults(query: string) {
        let resultsHtml = '<ul>';
        // Busca em transações
        this.state.transactions.filter(t => t.description.toLowerCase().includes(query)).forEach(t => {
            resultsHtml += `<li><strong>Transação:</strong> ${t.description} - ${this.formatCurrency(t.amount)}</li>`;
        });
        // Busca em clientes
         this.state.clients.filter(c => c.name.toLowerCase().includes(query) || c.company.toLowerCase().includes(query)).forEach(c => {
            resultsHtml += `<li><strong>Cliente:</strong> ${c.name} (${c.company})</li>`;
        });
        // Busca em oportunidades
         this.state.opportunities.filter(o => o.title.toLowerCase().includes(query)).forEach(o => {
            resultsHtml += `<li><strong>Oportunidade:</strong> ${o.title} - ${o.stage}</li>`;
        });
        resultsHtml += '</ul>';

        if(resultsHtml === '<ul></ul>') resultsHtml = '<p>Nenhum resultado encontrado.</p>';

        this.showModal({ title: `Resultados para "${query}"`, body: resultsHtml });
    }

    // --- Funções Auxiliares e Utilitários ---
    
    /**
     * Escapa caracteres HTML para prevenir XSS.
     * @param unsafe - A string a ser escapada.
     * @returns A string segura.
     */
    private escapeHtml(unsafe: string): string {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    /**
     * Gera o HTML padrão para o cabeçalho de uma tela.
     * @param title - O título principal.
     * @param subtitle - O subtítulo.
     * @returns Uma string HTML com o cabeçalho.
     */
    private generateScreenHeader(title: string, subtitle: string): string {
        return `<header class="screen-header"><h2>${title}</h2><p>${subtitle}</p></header>`;
    }

    /**
     * Formata um número para uma string de moeda em Real (BRL).
     * @param value - O valor numérico.
     * @returns A string formatada (ex: "R$ 1.234,56").
     */
    private formatCurrency(value: number): string {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }
    
    /**
     * Calcula os totais financeiros (geral e mensal).
     * @param month - Opcional. Se fornecido, calcula os totais apenas para este mês.
     * @returns Um objeto com todos os totais calculados.
     */
    private calculateTotals(month?: string): { totalBalance: number, totalRevenue: number, totalExpenses: number, monthBalance: number, monthRevenue: number, monthExpenses: number } {
        // Usa as transações do mês ou todas as transações se o mês não for especificado.
        const transactionsToConsider = month ? this.state.transactions.filter(t => t.date.startsWith(month)) : this.state.transactions;

        // Cálculos totais (sempre sobre todas as transações)
        const totalBalance = this.state.transactions.reduce((acc, t) => acc + t.amount, 0);
        const totalRevenue = this.state.transactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.amount, 0);
        const totalExpenses = this.state.transactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.amount, 0);
        
        // Cálculos mensais (sobre as transações filtradas)
        const monthBalance = transactionsToConsider.reduce((acc, t) => acc + t.amount, 0);
        const monthRevenue = transactionsToConsider.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.amount, 0);
        const monthExpenses = transactionsToConsider.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.amount, 0);
        
        return { totalBalance, totalRevenue, totalExpenses, monthBalance, monthRevenue, monthExpenses };
    }
    
    // --- Importação/Exportação de Dados ---

    /**
     * Salva o estado atual da aplicação em um arquivo JSON e inicia o download.
     */
    private saveBackup(): void {
        const dataStr = JSON.stringify(this.state, null, 2); // `null, 2` formata o JSON para ser legível.
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gestor_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url); // Libera a memória.
    }
    
    /**
     * Carrega um estado a partir de um arquivo JSON selecionado pelo usuário.
     * @param event - O evento de mudança do input de arquivo.
     */
    private loadBackup(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const newState = JSON.parse(e.target?.result as string);
                // Validação básica para garantir que o arquivo tem a estrutura esperada.
                if ('transactions' in newState && 'clients' in newState && 'opportunities' in newState) {
                    this.showConfirmationModal("Tem certeza que deseja carregar este backup? Todos os dados atuais serão substituídos.", () => {
                        this.state = newState;
                        this.saveState();
                        this.showAlertModal("Backup carregado com sucesso!", "Sucesso");
                        this.navigateTo('painel');
                    });
                } else {
                    this.showAlertModal("Arquivo de backup inválido.", "Erro");
                }
            } catch (error) {
                this.showAlertModal("Erro ao ler o arquivo de backup.", "Erro");
            }
        };
        reader.readAsText(file);
    }
    
    /**
     * Exporta os dados de um relatório para um arquivo PDF.
     * @param textAnalysis - O texto de análise a ser incluído.
     * @param chartCanvas - O elemento canvas do gráfico a ser incluído como imagem.
     * @param tableData - Os dados a serem incluídos em uma tabela.
     */
    private async exportToPDF(textAnalysis: string, chartCanvas: HTMLCanvasElement, tableData: any[]): Promise<void> {
        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text("Relatório - Gestor", 14, 22);
        
        doc.setFontSize(12);
        // Limpa o texto (Markdown simples) para renderização no PDF.
        const cleanedText = textAnalysis.replace(/###/g, '').replace(/\*/g, '').split('\n').filter(line => line.trim() !== '');
        let yPos = 35;
        cleanedText.forEach(line => {
            doc.text(line.trim(), 14, yPos);
            yPos += 7;
        });

        // Adiciona a imagem do gráfico ao PDF.
        const chartImage = chartCanvas.toDataURL('image/png');
        doc.addImage(chartImage, 'PNG', 14, yPos, 180, 100);
        yPos += 110;

        // Adiciona a tabela de dados, se houver.
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

// Ponto de entrada da aplicação. Instancia a classe GestorApp quando o DOM está totalmente carregado.
document.addEventListener('DOMContentLoaded', () => {
    new GestorApp();
});
export {};