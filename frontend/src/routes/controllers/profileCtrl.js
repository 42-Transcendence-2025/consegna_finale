import {CONFIG} from "../../../config.js";

/**
 * Controller per la pagina profilo. Carica il profilo dell'utente autenticato
 * con GET /profile/, oppure il profilo di un altro utente passando
 * ?user=<username> nell'hash o salvando lo username in localStorage.
 * Mostra informazioni base, tornei, statistiche e partite.
 */
export class ProfileController {
    titleSuffix = "Profile";

    async init() {
        // Legge eventuale username dall'URL (?user=…) o da localStorage
        const hash = window.location.hash;
        const query = hash.includes("?") ? hash.split("?")[1] : "";
        const params = new URLSearchParams(query);
        let targetUser = params.get("user");
        if (!targetUser) {
            targetUser = localStorage.getItem("selectedProfileUsername") || null;
        }
        if (targetUser) {
            localStorage.removeItem("selectedProfileUsername");
        }
        this.targetUser = targetUser;
        this.#renderLoading();
        
        // Setup image upload handlers
        this.#setupProfileImageHandlers();
        
        await this.#fetchAndRenderProfile();
    }

    #renderLoading() {
        $("#profile-info").html(
            `<div class="text-center py-5 text-muted">${$.i18n("loading") ?? "Loading..."}</div>`
        );
        $("#tournaments-list").empty();
        $("#matches-list").empty();
    }

    async #fetchAndRenderProfile() {
        try {
            let url;
            if (this.targetUser) {
                url = `${CONFIG.apiRoutes.profileApiUrl}/profile/${encodeURIComponent(this.targetUser)}/`;
            } else {
                url = `${CONFIG.apiRoutes.profileApiUrl}/profile/`;
            }
            const data = await $.ajax({
                url,
                method: "GET",
                dataType: "json",
            });
            this.#renderProfile(data);
        } catch (err) {
            const msg =
                err?.responseJSON?.detail ||
                err?.statusText ||
                "Failed to load profile";
            this.#renderError(msg);
        }
    }

    #renderError(message) {
        $("#profile-info").html(
            `<div class="alert alert-danger" role="alert">${message}</div>`
        );
        $("#tournaments-list").empty();
        $("#matches-list").empty();
    }

    #renderProfile(data) {
        // Informazioni di base
        this.#renderBasicInfo(data);

        // Amicizia
        this.#renderFriendshipButton(data);

        // Tornei
        this.#renderTournaments(data.tournaments || []);
        // Calcola e visualizza le statistiche prima dell'elenco partite
        const stats = this.#computeStats(data.matches || []);
        this.#renderStats(stats);
        // Partite
        this.#renderMatches(data.matches || []);
        // Applica traduzioni
        $(document.body).i18n();
    }

    #renderBasicInfo(data) {
        const trophiesLabel = $.i18n('trophies') ?? "trophies";
        const lastActivityLabel = $.i18n('lastActivity') ?? "last activity";
        const lastActivity = data.last_activity
            ? new Date(data.last_activity).toLocaleString()
            : "N/A";
        
        // Determina il percorso dell'avatar
        let avatarPath;
        if (data.profile_image) {
            avatarPath = data.profile_image;
        } else {
            // Fallback al sistema hash-based per utenti senza immagine
            const defaultIcons = [
                "cole(easy).png",
                "goku.png",
                "lucia.png",
                "matt.png",
                "nick(medium).png",
                "rin(hard).png",
                "vegeta.png",
            ];
            let avatar = defaultIcons[0];
            if (data.username) {
                const idx =
                    Math.abs(this.#hashString(data.username)) %
                    defaultIcons.length;
                avatar = defaultIcons[idx];
            }
            avatarPath = `assets/default_icons/${avatar}`;
        }
        
        // Determina se questo è il profilo dell'utente corrente
        const currentUserToken = localStorage.getItem('access_token');
        const currentUsername = this.#getCurrentUsername();
        const isOwnProfile = currentUserToken && data.username === currentUsername;
        
        const emailHtml = data.email
            ? `<p class="mb-0 small text-muted">${data.email}</p>`
            : "";
            
        // HTML per l'immagine del profilo con icona di modifica se è il proprio profilo
        const avatarHtml = isOwnProfile || (!this.targetUser) // Mostra sempre se non c'è targetUser specificato
            ? `<div class="text-center me-3">
                 <img src="${avatarPath}" alt="Avatar" id="profile-avatar"
                      style="width:80px; height:80px; border-radius:50%; object-fit:cover;" class="d-block">
                 <button type="button" class="btn btn-sm btn-outline-light mt-2" id="edit-profile-image-btn" 
                         style="border-radius: 15px; font-size: 0.8rem;">
                   <i class="fa fa-camera me-1"></i>Edit
                 </button>
               </div>`
            : `<img src="${avatarPath}" alt="Avatar"
                    style="width:80px; height:80px; border-radius:50%; object-fit:cover;" class="me-3">`;
        
        $("#profile-info").html(
            `
            <div class="card shadow-sm bg-dark text-white p-4" style="border-radius: 18px;">
                <div class="row g-0 align-items-center">
                    <div class="col-auto">
                        ${avatarHtml}
                    </div>
                    <div class="col">
                        <h3 class="mb-1">${data.username ?? ""}</h3>
                        ${emailHtml}
                        <p class="mb-1 small"><strong>${trophiesLabel}:</strong> ${data.trophies ?? 0}</p>
                        <p class="mb-0 small"><strong>${lastActivityLabel}:</strong> ${lastActivity}</p>
                    </div>
                </div>
            </div>
            `
        );
    }

    #renderTournaments(tournaments) {
        const $list = $("#tournaments-list");
        $list.empty();
        if (!Array.isArray(tournaments) || tournaments.length === 0) {
            $list.append(
                `<div class="alert alert-warning text-center" data-i18n="noTournamentsFound">Nessun torneo trovato.</div>`
            );
            return;
        }
        for (const t of tournaments) {
            const createdAt = t.created_at
                ? new Date(t.created_at).toLocaleDateString()
                : "";
            const posClass = this.#positionToBadgeClass(t.position);
            $list.append(
                `
                <div class="card shadow-sm bg-dark text-white tournament-card"
                    data-tournament-id="${t.id}"
                    style="cursor:pointer; border-radius:12px;">
                    <div class="card-body d-flex flex-column flex-md-row justify-content-between align-items-center">
                        <div class="mb-2 mb-md-0">
                            <h5 class="mb-0">${t.name ?? "Unnamed Tournament"}</h5>
                            <small class="text-muted">${createdAt}</small>
                        </div>
                        <div class="d-flex flex-column flex-sm-row align-items-center gap-2">
                            <span class="badge ${posClass}">${t.position}</span>
                            <span class="badge bg-secondary">${t.status}</span>
                        </div>
                    </div>
                </div>
                `
            );
        }
        // naviga al torneo al click
        $list.find(".tournament-card").on("click", (e) => {
            const id = $(e.currentTarget).data("tournament-id");
            if (id != null) {
                localStorage.setItem("currentTournamentId", id);
                window.location.hash = "#tournament";
            }
        });
    }

    #renderMatches(matches) {
        const $list = $("#matches-list");
        $list.empty();
        if (!Array.isArray(matches) || matches.length === 0) {
            $list.append(
                `<div class="alert alert-warning text-center">No matches found.</div>`
            );
            return;
        }
        for (const m of matches) {
            const createdAt = m.created_at
                ? new Date(m.created_at).toLocaleDateString()
                : "";
            const tournamentPart = m.tournament_name
                ? `<span class="badge bg-info">${m.tournament_name}</span>`
                : "";
            const statusClass = this.#statusToBadgeClass(m.status);
            // Colora l'intera card in base al risultato (win/lose/draw)
            let outcomeClass = "";
            const pf = Number.isFinite(m.points_for) ? m.points_for : null;
            const pa = Number.isFinite(m.points_against) ? m.points_against : null;
            if (pf !== null && pa !== null) {
                if (pf > pa) outcomeClass = "border-success";
                else if (pf < pa) outcomeClass = "border-danger";
                else outcomeClass = "border-warning";
            }
            const pointsDisplay =
                pf !== null && pa !== null ? `${pf} - ${pa}` : "N/A";
            $list.append(
                `
                <div class="card shadow-sm bg-dark text-white ${outcomeClass}" style="border-radius:12px; border-width:2px;">
                    <div class="card-body d-flex flex-column flex-md-row justify-content-between align-items-center">
                        <div class="mb-2 mb-md-0">
                            <h6 class="mb-0">vs ${m.opponent_username ?? "Unknown"}</h6>
                            <small class="text-muted">${createdAt}</small>
                            ${tournamentPart}
                        </div>
                        <div class="d-flex flex-column flex-sm-row align-items-center gap-2">
                            <span class="badge bg-primary">${pointsDisplay}</span>
                            <span class="badge ${statusClass}">${m.status}</span>
                        </div>
                    </div>
                </div>
                `
            );
        }
    }

    #renderFriendshipButton(data) {
        // Se is_friend è null, significa che stai guardando il tuo profilo
        if (data.is_friend === null) {
            return;
        }

        const container = $("#profile-friendship-actions");
        container.empty();

        const isFriend = data.is_friend;
        const buttonClass = isFriend ? "btn-outline-danger" : "btn-outline-success";
        const buttonText = isFriend ? "Remove Friend" : "Add Friend";
        const buttonIcon = isFriend ? "fa-user-minus" : "fa-user-plus";

        const buttonHtml = `
            <div class="text-center mb-4">
                <button id="friendship-btn" 
                        class="btn ${buttonClass} d-flex align-items-center gap-2 mx-auto"
                        data-username="${data.username}"
                        data-is-friend="${isFriend}">
                    <i class="fa ${buttonIcon}"></i>
                    <span>${buttonText}</span>
                </button>
            </div>
        `;

        container.html(buttonHtml);

        // Aggiungi event listener
        $("#friendship-btn").on("click", async (e) => {
            await this.#handleFriendshipAction(e);
        });
    }

    async #handleFriendshipAction(event) {
        const button = $(event.currentTarget);
        const username = button.data("username");
        const isFriend = button.data("is-friend");

        // Disabilita il pulsante durante la richiesta
        button.prop("disabled", true);

        try {
            const method = isFriend ? "DELETE" : "POST";
            const url = `${CONFIG.apiRoutes.userApiUrl}/friends/${encodeURIComponent(username)}/`;

            const response = await $.ajax({
                url,
                method,
                dataType: "json",
            });

            // Aggiorna il pulsante
            if (isFriend) {
                // Era amico, ora non più
                button.removeClass("btn-outline-danger").addClass("btn-outline-success");
                button.find("i").removeClass("fa-user-minus").addClass("fa-user-plus");
                button.find("span").text("Add Friend");
                button.data("is-friend", false);
            } else {
                // Non era amico, ora sì
                button.removeClass("btn-outline-success").addClass("btn-outline-danger");
                button.find("i").removeClass("fa-user-plus").addClass("fa-user-minus");
                button.find("span").text("Remove Friend");
                button.data("is-friend", true);
            }

            // Mostra messaggio di successo
            this.#showSuccessMessage(response.detail || "Friend status updated successfully");

        } catch (error) {
            console.error("Error updating friendship:", error);
            const errorMsg = error?.responseJSON?.detail || "Failed to update friend status";
            this.#showErrorMessage(errorMsg);
        } finally {
            // Riabilita il pulsante
            button.prop("disabled", false);
        }
    }

    #showSuccessMessage(message) {
        // Rimuovi messaggi precedenti
        $(".alert-success").remove();

        const alert = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        $("#profile-friendship-actions").prepend(alert);

        // Auto-rimuovi dopo 3 secondi
        setTimeout(() => {
            $(".alert-success").fadeOut();
        }, 3000);
    }

    #showErrorMessage(message) {
        // Rimuovi messaggi precedenti
        $(".alert-danger").remove();

        const alert = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        $("#profile-friendship-actions").prepend(alert);
    }

    /**
     * Calcola statistiche derivate dalla cronologia delle partite.
     * Non richiede chiamate al backend.
     */
    #computeStats(matches) {
        if (!Array.isArray(matches)) return {};
        const stats = {
            total: matches.length,
            wins: 0,
            losses: 0,
            draws: 0,
            totalPointsFor: 0,
            totalPointsAgainst: 0,
            currentStreak: 0,
            longestStreak: 0,
        };
        let currentStreak = 0;
        let longestStreak = 0;
        for (const m of matches) {
            const pf = Number.isFinite(m.points_for) ? m.points_for : 0;
            const pa = Number.isFinite(m.points_against) ? m.points_against : 0;
            stats.totalPointsFor += pf;
            stats.totalPointsAgainst += pa;
            if (pf > pa) {
                stats.wins++;
                currentStreak++;
            } else if (pf < pa) {
                stats.losses++;
                currentStreak = 0;
            } else {
                stats.draws++;
                currentStreak = 0;
            }
            if (currentStreak > longestStreak) longestStreak = currentStreak;
        }
        stats.currentStreak = currentStreak;
        stats.longestStreak = longestStreak;
        stats.winPercentage = stats.total
            ? ((stats.wins / stats.total) * 100).toFixed(1)
            : 0;
        stats.avgPointsFor = stats.total
            ? (stats.totalPointsFor / stats.total).toFixed(1)
            : 0;
        stats.avgPointsAgainst = stats.total
            ? (stats.totalPointsAgainst / stats.total).toFixed(1)
            : 0;
        return stats;
    }

    #renderStats(stats) {
        const $container = $("#profile-stats");
        $container.empty();
        const items = [
            { label: $.i18n("totalMatches") ?? "Total Matches", value: stats.total },
            { label: $.i18n("profile-wins") ?? "Wins", value: stats.wins },
            { label: $.i18n("losses") ?? "Losses", value: stats.losses },
            { label: $.i18n("draws") ?? "Draws", value: stats.draws },
            { label: $.i18n("winPercentage") ?? "Win %", value: stats.winPercentage + "%" },
            { label: $.i18n("currentStreak") ?? "Current Streak", value: stats.currentStreak },
            { label: $.i18n("longestStreak") ?? "Longest Streak", value: stats.longestStreak },
            { label: $.i18n("avgPointsScored") ?? "Avg. Points Scored", value: stats.avgPointsFor },
            { label: $.i18n("avgPointsAgainst") ?? "Avg. Points Against", value: stats.avgPointsAgainst },
        ];
        for (const item of items) {
            const card = `
                <div class="col">
                    <div class="card bg-dark text-white h-100" style="border-radius:12px;">
                        <div class="card-body d-flex flex-column justify-content-center align-items-center">
                            <h6 class="card-subtitle mb-1 text-info">${item.label}</h6>
                            <h4 class="card-title">${item.value}</h4>
                        </div>
                    </div>
                </div>
            `;
            $container.append(card);
        }
    }

    #positionToBadgeClass(position) {
        if (!position) return "bg-secondary";
        const pos = position.toLowerCase();
        if (pos.includes("1st") || pos.includes("winner")) return "bg-warning text-dark";
        if (pos.includes("2nd")) return "bg-light text-dark";
        if (pos.includes("3rd")) return "bg-info";
        return "bg-secondary";
    }

    #statusToBadgeClass(status) {
        if (!status) return "bg-secondary";
        const st = status.toLowerCase();
        if (st.includes("completed")) return "bg-success";
        if (st.includes("pending")) return "bg-warning text-dark";
        if (st.includes("active")) return "bg-primary";
        return "bg-secondary";
    }

    #hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    #getCurrentUsername() {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return null;
            
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.username;
        } catch (error) {
            return null;
        }
    }

    #setupProfileImageHandlers() {
        // Click handler for edit button
        $(document).on('click', '#edit-profile-image-btn', () => {
            this.#showImageUploadModal();
        });
    }

    #showImageUploadModal() {
        const modalHtml = `
            <div class="modal fade" id="profileImageModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content bg-dark text-white">
                        <div class="modal-header">
                            <h5 class="modal-title">Change Profile Image</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="imageFile" class="form-label">Select Image (JPG, PNG, GIF - Max 5MB)</label>
                                <input type="file" class="form-control" id="imageFile" accept="image/jpeg,image/jpg,image/png,image/gif">
                            </div>
                            <div id="imagePreview" class="text-center mb-3" style="display: none;">
                                <img id="previewImg" src="" alt="Preview" style="max-width: 200px; max-height: 200px; border-radius: 10px;">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-warning" id="resetImageBtn">Reset to Random</button>
                            <button type="button" class="btn btn-primary" id="uploadImageBtn">Upload</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        $('#profileImageModal').remove();
        
        // Add modal to body
        $('body').append(modalHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('profileImageModal'));
        modal.show();
        
        // Handle file selection
        $('#imageFile').on('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    $('#previewImg').attr('src', e.target.result);
                    $('#imagePreview').show();
                };
                reader.readAsDataURL(file);
            } else {
                $('#imagePreview').hide();
            }
        });
        
        // Handle upload button
        $('#uploadImageBtn').on('click', () => {
            this.#handleImageUpload();
        });
        
        // Handle reset button
        $('#resetImageBtn').on('click', () => {
            this.#handleImageReset();
        });
    }

    async #handleImageUpload() {
        const fileInput = document.getElementById('imageFile');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select an image file.');
            return;
        }
        
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            const response = await $.ajax({
                url: `${CONFIG.apiRoutes.userApiUrl}/profile/image/`,
                method: 'POST',
                data: formData,
                processData: false,
                contentType: false
            });
            
            $('#profileImageModal').modal('hide');
            alert('Image uploaded successfully!');
            
            // Refresh profile to show new image
            await this.#fetchAndRenderProfile();
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload image');
        }
    }

    async #handleImageReset() {
        try {
            await $.ajax({
                url: `${CONFIG.apiRoutes.userApiUrl}/profile/image/`,
                method: 'DELETE'
            });
            
            $('#profileImageModal').modal('hide');
            alert('Image reset successfully!');
            
            // Refresh profile to show new random image
            await this.#fetchAndRenderProfile();
        } catch (error) {
            console.error('Reset error:', error);
            alert('Failed to reset image');
        }
    }
}
