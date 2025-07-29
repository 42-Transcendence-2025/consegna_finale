import {CONFIG} from "../../../config.js";

/**
 * HistoryController
 *
 * Questo controller alimenta la pagina cronologia estesa. Carica l'intera
 * cronologia partite dell'utente autenticato tramite il servizio profili
 * e consente di cercare, filtrare e ordinare le partite in modo client-side.
 */
export class HistoryController {
    titleSuffix = "Match History";

    async init() {
        // inizializza eventi dei controlli
        $("#history-search-form").on("submit", (e) => {
            e.preventDefault();
            this.#renderMatches();
        });
        $("#history-filter").on("change", () => this.#renderMatches());
        $("#history-sort").on("change", () => this.#renderMatches());

        // carica partite
        this.matches = [];
        this.#showLoading();
        await this.#loadMatches();
        this.#renderMatches();
    }

    #showLoading() {
        const $list = $("#history-matches-list");
        $list.empty();
        $list.append(
            `<div class="text-center py-5 text-muted">${$.i18n('loading') ?? 'Loading...'}</div>`
        );
    }

    async #loadMatches() {
        try {
            const data = await $.ajax({
                url: `${CONFIG.apiRoutes.profileApiUrl}/profile/`,
                method: "GET",
                dataType: "json",
            });
            this.matches = Array.isArray(data.matches) ? data.matches : [];
        } catch (err) {
            console.error("Failed to load history", err);
            this.matches = [];
        }
    }

    /**
     * Filtra e ordina le partite secondo la ricerca, filtro e ordinamento
     * selezionati, poi le rende sulla pagina.
     */
    #renderMatches() {
        const $list = $("#history-matches-list");
        $list.empty();
        if (!Array.isArray(this.matches) || this.matches.length === 0) {
            $list.append(`<div class="alert alert-warning text-center">No matches found.</div>`);
            return;
        }
        const searchTerm = $("#history-search-input").val().trim().toLowerCase();
        const filterVal = $("#history-filter").val();
        const sortVal = $("#history-sort").val();
        let results = this.matches.slice();

        // ricerca per avversario o torneo (contenimento, case insensitive)
        if (searchTerm) {
            results = results.filter((m) => {
                const opp = (m.opponent || '').toLowerCase();
                const tour = (m.tournament_name || '').toLowerCase();
                return opp.includes(searchTerm) || tour.includes(searchTerm);
            });
        }
        // filtro per esito
        results = results.filter((m) => {
            const pf = Number.isFinite(m.points_for) ? m.points_for : null;
            const pa = Number.isFinite(m.points_against) ? m.points_against : null;
            let outcome = 'unknown';
            if (pf != null && pa != null) {
                if (pf > pa) outcome = 'win';
                else if (pf < pa) outcome = 'loss';
                else outcome = 'draw';
            }
            if (filterVal === 'all') return true;
            return outcome === filterVal;
        });
        // ordinamento per data
        results.sort((a, b) => {
            const da = new Date(a.created_at);
            const db = new Date(b.created_at);
            return sortVal === 'oldest' ? da - db : db - da;
        });

        // rendering finale
        if (results.length === 0) {
            $list.append(`<div class="alert alert-info text-center">No matches match your filters.</div>`);
            return;
        }
        results.forEach((m) => {
            const createdAt = m.created_at ? new Date(m.created_at).toLocaleDateString() : '';
            const tournamentPart = m.tournament_name ? `<span class="badge bg-info">${m.tournament_name}</span>` : '';
            const statusClass = this.#statusToBadgeClass(m.status);
            // colore card in base al risultato
            let outcomeClass = '';
            const pf = Number.isFinite(m.points_for) ? m.points_for : null;
            const pa = Number.isFinite(m.points_against) ? m.points_against : null;
            if (pf != null && pa != null) {
                if (pf > pa) outcomeClass = 'bg-success-subtle border border-success';
                else if (pf < pa) outcomeClass = 'bg-danger-subtle border border-danger';
                else outcomeClass = 'bg-secondary-subtle border border-secondary';
            } else {
                outcomeClass = 'bg-dark';
            }
            $list.append(`
                <div class="card shadow-sm ${outcomeClass} mb-2" style="border-radius:12px;">
                    <div class="card-body d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                        <div class="flex-grow-1">
                            <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                                <strong>vs ${m.opponent ?? 'Unknown'}</strong>
                                ${tournamentPart}
                            </div>
                            <small class="text-muted">${createdAt}</small>
                        </div>
                        <div class="d-flex align-items-center gap-1 fs-4 fw-bold">
                            <span class="text-success">${m.points_for ?? '-'}</span>
                            <span>-</span>
                            <span class="text-danger">${m.points_against ?? '-'}</span>
                        </div>
                        <div>
                            <span class="badge ${statusClass}">${m.status}</span>
                        </div>
                    </div>
                </div>
            `);
        });
    }

    #statusToBadgeClass(status) {
        switch ((status || '').toLowerCase()) {
            case 'completed':
            case 'finished':
                return 'bg-success';
            case 'pending':
            case 'in_progress':
            case 'in progress':
                return 'bg-warning text-dark';
            case 'cancelled':
            case 'forfeited':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    }
}
