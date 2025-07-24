//id, players_count, name

export class TournamentMenuController {
    titleSuffix = "Tournaments";

    async init() {
        // Assicurati che le informazioni dell'utente siano caricate
        await this.#ensureUserInfoLoaded();
        
        this.#fetchAndRenderTournaments();
        this.#bindCreateTournament();
        this.#setupLanguageChangeListener();
        
        // Aggiorna la lista ogni 5 secondi
        if (this._tournamentInterval)
            clearInterval(this._tournamentInterval);

        this._tournamentInterval = setInterval(() => this.#fetchAndRenderTournaments(), 5000);

        $(window).one("hashchange", () => clearInterval(this._tournamentInterval));
    }

    async #ensureUserInfoLoaded() {
        try {
            // Se l'authManager è disponibile ma non ha ancora le informazioni utente, caricale
            if (window.tools?.authManager?.isLoggedIn() && !window.tools.authManager.username) {
                await window.tools.authManager.getUserInfo();
            }
        } catch (error) {
            console.warn("Could not load user info:", error);
        }
    }

    #bindCreateTournament() {
        // Mostra il modal quando si clicca il bottone
        $("#create-tournament-btn").on("click", () => {
            $("#tournamentNameInput").val("");
            const modal = new window.bootstrap.Modal(document.getElementById('createTournamentModal'));
            modal.show();
        });

        // Gestisci la creazione torneo
        $("#confirmCreateTournament").on("click", async () => {
            const name = $("#tournamentNameInput").val().trim();
            if (!name) {
                $("#tournamentNameInput").addClass("is-invalid");
                return;
            }
            $("#tournamentNameInput").removeClass("is-invalid");
            try {
                const created = await window.tools.matchManager.createTournament(name);
                // Chiudi il modal
                window.bootstrap.Modal.getInstance(document.getElementById('createTournamentModal')).hide();
                // reinderizza alla pagina del torneo
                localStorage.setItem('currentTournamentId', created.tournament_id);
                window.location.hash = "#tournament";
            } catch (err) {
                alert($.i18n('failedToCreateTournament'));
            }
        });
    }

    #renderTournamentCard(tournament) {
        return `
        <div class="card shadow-sm position-relative tournament-card" data-tournament-id="${tournament.id}" style="min-height: 120px; border-radius: 18px; cursor: pointer;">
            <div class="position-absolute top-0 start-0 p-3">
                <span class="fw-bold fs-4">${tournament.name}</span>
            </div>
            <div class="position-absolute bottom-0 end-0 p-3">
                <span class="badge bg-info fs-5">${tournament.players_count}/8</span>
            </div>
        </div>
        `;
    }

    async #fetchAndRenderTournaments() {
        const $list = $("#tournament-list");
        // Ottieni la lista attuale dei tornei già renderizzati
        const currentTournaments = {};
        $list.children('.tournament-card').each(function() {
            const id = $(this).data('tournament-id');
            currentTournaments[id] = $(this);
        });
        try {
            const response =  await window.tools.matchManager.fetchTournaments();
            if (Array.isArray(response)) {
                const newIds = new Set();
                for (const t of response) {
                    newIds.add(t.id);
                    const $existing = currentTournaments[t.id];
                    if ($existing &&
                        $existing.find('.fw-bold.fs-4').text() === t.name &&
                        $existing.find('.badge').text() === `${t.players_count}/8`) {
                        // Nessuna modifica, lascia il torneo com'è
                        continue;
                    }
                    // Se esiste ma è cambiato, sostituisci
                    if ($existing) {
                        $existing.replaceWith(this.#renderTournamentCard(t));
                    } else {
                        // Nuovo torneo, aggiungi in fondo
                        $list.append(this.#renderTournamentCard(t));
                    }
                }
                // Rimuovi tornei non più presenti
                for (const id in currentTournaments) {
                    if (!newIds.has(Number(id))) {
                        currentTournaments[id].remove();
                    }
                }
                // Re-bind click handler dopo eventuali cambiamenti
                this.#bindTournamentCardClicks();
            } else {
                $list.html(`<div class='alert alert-warning'>${$.i18n('noTournamentsFound')}</div>`);
            }
        } catch (err) {
            $list.html(`<div class='alert alert-danger'>${$.i18n('failedToLoadTournaments')}</div>`);
        }
    }

    #bindTournamentCardClicks() {
        $(".tournament-card").off("click").on("click", async (event) => {
            const tournamentId = $(event.currentTarget).data("tournament-id");
            try {
                const result = await window.tools.matchManager.getTournamentDetails(tournamentId);
                this.#showTournamentDetailsModal(result);
            } catch (err) {
                console.error("Failed to fetch tournament details", err);
            }
        });
    }

    #showTournamentDetailsModal(tournament) {
        // Popola nome torneo
        $("#tournamentDetailsModalLabel").text(tournament.name);
        // Popola numero giocatori
        $("#tournamentPlayersCount").text(`${$.i18n('players')} ${tournament.players.length}/8`);
        // Popola lista giocatori
        const $list = $("#tournamentPlayersList");
        $list.empty();
        if (Array.isArray(tournament.players) && tournament.players.length > 0) {
            for (const p of tournament.players) {
                $list.append(`<li class='list-group-item text-center'>${p}</li>`);
            }
        } else {
            $list.append(`<li class='list-group-item text-center text-muted'>${$.i18n('noPlayersYet')}</li>`);
        }
        // Mostra il modal
        const modal = new window.bootstrap.Modal(document.getElementById('tournamentDetailsModal'));
        modal.show();
        // Gestisci il click su Subscribe
        const authManager = window.tools.authManager;
        const currentUser = authManager?.username;
        
        // Debug: verifica se l'utente è stato caricato correttamente
        if (authManager?.isLoggedIn() && !currentUser) {
            console.warn("User is logged in but username not available yet");
        }
        
        const isSubscribed = tournament.players.some(p => p === currentUser);

        // Mostra il pulsante giusto
        const $footer = $("#tournamentDetailsModal .modal-footer");
        $footer.empty();

        if (isSubscribed) {
            const $btn = $(`<button class="btn btn-success flex-grow-1" id="goToTournamentBtn">${$.i18n('goToTournament')}</button>`);
            $footer.append($btn);
            $btn.on("click", () => {
                localStorage.setItem('currentTournamentId', tournament.id);
                modal.hide();
                window.location.hash = "#tournament";
            });
        } else {
            const $btn = $(`<button class="btn btn-primary flex-grow-1" id="subscribeTournamentBtn">${$.i18n('subscribe')}</button>`);
            $footer.append($btn);
            $btn.on("click", async () => {
                try {
                    await  window.tools.matchManager.subscribeToTournament(tournament.id);
                    localStorage.setItem('currentTournamentId', tournament.id);
                    modal.hide();
                    window.location.hash = "#tournament";
                } catch (err) {
                    let msg = $.i18n('subscriptionFailed');
                    if (err.responseJSON?.detail) {
                        msg = err.responseJSON.detail;
                    } else if (err.responseText) {
                        msg = err.responseText;
                    }
                    this.#showTemporaryMessage(msg, true);
                }
            });
        }
    }

    #showTemporaryMessage(message, isError = false) {
        const msgDiv = document.createElement("div");
        msgDiv.textContent = message;
        msgDiv.className = `position-fixed start-50 translate-middle-x px-4 py-2 rounded shadow text-white fw-bold ${isError ? "bg-danger" : "bg-success"}`;
        msgDiv.style.zIndex = "9999";
        msgDiv.style.top = "3rem";
        msgDiv.style.fontSize = "1.25rem";
        document.body.appendChild(msgDiv);
        setTimeout(() => {
            msgDiv.remove();
        }, 3000);
    }

    #setupLanguageChangeListener() {
        // Ascolta i cambi di lingua e ri-renderizza per aggiornare i testi
        document.addEventListener('languageChanged', () => {
            this.#fetchAndRenderTournaments();
        });
    }
}
