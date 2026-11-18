/**
 * ============================================================================
 * Project: Ludo Game Core Engine
 * Language: C (C99 Standard)
 * Description: Core implementation of Ludo logic, rules, board mappings,
 *              interactive terminal UI, and JSON engine mode for web integration.
 * ============================================================================
 */

#include "ludo.h"

/* Common track start tile index for each player */
static const int START_TILES[NUM_PLAYERS] = {
    0,   /* Red starts at common tile 0 */
    13,  /* Green starts at common tile 13 */
    26,  /* Yellow starts at common tile 26 */
    39   /* Blue starts at common tile 39 */
};

/* 8 Safe spots on the common 52-tile track (4 starts + 4 stars) */
static const int SAFE_SPOTS[NUM_SAFE_SPOTS] = {
    0, 8, 13, 21, 26, 34, 39, 47
};

/* Player color names */
static const char *COLOR_NAMES[NUM_PLAYERS] = {
    "Red", "Green", "Yellow", "Blue"
};

/**
 * Initialize a new game state.
 * All tokens placed in base (-1), Red player goes first.
 */
void init_game(struct GameState *state) {
    if (!state) return;

    memset(state, 0, sizeof(struct GameState));
    state->current_player = PLAYER_RED;
    state->last_dice = 0;
    state->dice_rolled = 0;
    state->extra_turn = 0;
    state->winner = -1;
    snprintf(state->status_msg, sizeof(state->status_msg), "Game started! Red player's turn to roll.");

    for (int p = 0; p < NUM_PLAYERS; p++) {
        state->players[p].id = p;
        snprintf(state->players[p].name, sizeof(state->players[p].name), "%s", COLOR_NAMES[p]);
        state->players[p].home_count = 0;
        state->players[p].is_active = 1;

        for (int t = 0; t < TOKENS_PER_PLAYER; t++) {
            state->players[p].tokens[t] = STEP_BASE; /* -1 represents base / yard */
        }
    }
}

/**
 * Generate a random dice roll between 1 and 6.
 */
int roll_dice(void) {
    return (rand() % 6) + 1;
}

/**
 * Get starting tile on the 52-tile board for given player.
 */
int get_start_tile(int player_id) {
    if (player_id < 0 || player_id >= NUM_PLAYERS) return -1;
    return START_TILES[player_id];
}

/**
 * Convert player's relative step (0-56) to common board tile (0-51).
 * Returns -1 if token is in Base, Home Path, or Home Goal.
 */
int get_common_tile(int player_id, int step) {
    if (step < 0 || step > 50) {
        return -1; /* Not on the common 52-tile track */
    }
    return (START_TILES[player_id] + step) % COMMON_TRACK_LENGTH;
}

/**
 * Check if a common track tile is a safe spot (star or start tile).
 * Returns 1 if safe, 0 if normal.
 */
int is_safe_tile(int tile_index) {
    if (tile_index < 0 || tile_index >= COMMON_TRACK_LENGTH) return 0;
    for (int i = 0; i < NUM_SAFE_SPOTS; i++) {
        if (SAFE_SPOTS[i] == tile_index) {
            return 1;
        }
    }
    return 0;
}

/**
 * Check if a specific token can legally move with the given dice value.
 * Rule:
 * 1. Base tokens can open with ANY dice roll (1 to 6) -> Option A!
 * 2. Active tokens can advance by dice value if they don't overshoot Home (56).
 */
int can_move_token(const struct GameState *state, int player_id, int token_id, int dice) {
    if (!state || state->winner != -1) return 0;
    if (player_id < 0 || player_id >= NUM_PLAYERS) return 0;
    if (token_id < 0 || token_id >= TOKENS_PER_PLAYER) return 0;
    if (dice < 1 || dice > 6) return 0;

    int current_step = state->players[player_id].tokens[token_id];

    /* Case 1: Token is already at Home Goal */
    if (current_step == STEP_HOME) {
        return 0;
    }

    /* Case 2: Token is in Base */
    if (current_step == STEP_BASE) {
        /* User Rule: Any dice roll (1-6) can open token from base to start tile */
        return 1;
    }

    /* Case 3: Token is on board / home stretch */
    if (current_step >= STEP_START && current_step < STEP_HOME) {
        int new_step = current_step + dice;
        /* Cannot overshoot exact home step 56 */
        if (new_step <= STEP_HOME) {
            return 1;
        }
    }

    return 0;
}

/**
 * Check if the current player has ANY valid move with the current dice value.
 */
int has_any_valid_move(const struct GameState *state, int player_id, int dice) {
    if (!state) return 0;
    for (int t = 0; t < TOKENS_PER_PLAYER; t++) {
        if (can_move_token(state, player_id, t, dice)) {
            return 1;
        }
    }
    return 0;
}

/**
 * Move a token according to game rules.
 * Handles:
 * - Opening from base
 * - Moving on common path
 * - Safe spots
 * - Capturing opponent tokens
 * - Moving into home stretch and reaching home
 * - Extra turn handling (if 6 was rolled)
 * Returns 1 on success, 0 on invalid move.
 */
int move_token(struct GameState *state, int player_id, int token_id, int dice) {
    if (!state) return 0;
    if (!can_move_token(state, player_id, token_id, dice)) {
        return 0;
    }

    int current_step = state->players[player_id].tokens[token_id];
    int captured = 0;
    char captured_info[64] = "";

    if (current_step == STEP_BASE) {
        /* Open token to start square (step 0) */
        state->players[player_id].tokens[token_id] = STEP_START;
        snprintf(state->status_msg, sizeof(state->status_msg),
                 "%s unlocked Token #%d to the start tile!",
                 state->players[player_id].name, token_id + 1);
    } else {
        int new_step = current_step + dice;
        state->players[player_id].tokens[token_id] = new_step;

        if (new_step == STEP_HOME) {
            /* Reached Home! */
            state->players[player_id].home_count++;
            snprintf(state->status_msg, sizeof(state->status_msg),
                     "🎉 %s's Token #%d reached HOME!",
                     state->players[player_id].name, token_id + 1);

            /* Check if player won */
            if (state->players[player_id].home_count == TOKENS_PER_PLAYER) {
                state->winner = player_id;
                snprintf(state->status_msg, sizeof(state->status_msg),
                         "🏆 Player %s has WON the game!",
                         state->players[player_id].name);
                state->dice_rolled = 0;
                return 1;
            }
        } else if (new_step <= 50) {
            /* On common track: check for captures */
            int dest_tile = get_common_tile(player_id, new_step);

            if (!is_safe_tile(dest_tile)) {
                for (int opp = 0; opp < NUM_PLAYERS; opp++) {
                    if (opp == player_id) continue;
                    for (int ot = 0; ot < TOKENS_PER_PLAYER; ot++) {
                        int opp_step = state->players[opp].tokens[ot];
                        if (opp_step >= 0 && opp_step <= 50) {
                            int opp_tile = get_common_tile(opp, opp_step);
                            if (opp_tile == dest_tile) {
                                /* Capture opponent's token! */
                                state->players[opp].tokens[ot] = STEP_BASE;
                                captured = 1;
                                snprintf(captured_info, sizeof(captured_info),
                                         " and captured %s's Token #%d!",
                                         state->players[opp].name, ot + 1);
                                break;
                            }
                        }
                    }
                    if (captured) break;
                }
            }

            if (captured) {
                snprintf(state->status_msg, sizeof(state->status_msg),
                         "⚔️ %s moved Token #%d%s",
                         state->players[player_id].name, token_id + 1, captured_info);
            } else {
                snprintf(state->status_msg, sizeof(state->status_msg),
                         "%s moved Token #%d forward %d steps.",
                         state->players[player_id].name, token_id + 1, dice);
            }
        } else {
            /* In home stretch (51-55) */
            snprintf(state->status_msg, sizeof(state->status_msg),
                     "%s moved Token #%d into the Home Stretch!",
                     state->players[player_id].name, token_id + 1);
        }
    }

    /* Turn handling: */
    state->dice_rolled = 0;

    /* Check if 6 was rolled -> grants extra turn */
    if (dice == 6) {
        state->extra_turn = 1;
        /* Turn remains with current_player */
        char extra_note[64];
        snprintf(extra_note, sizeof(extra_note), " (Rolled a 6 -> Extra Turn!)");
        strncat(state->status_msg, extra_note, sizeof(state->status_msg) - strlen(state->status_msg) - 1);
    } else {
        state->extra_turn = 0;
        next_turn(state);
    }

    return 1;
}

/**
 * Pass turn to the next player.
 */
void next_turn(struct GameState *state) {
    if (!state || state->winner != -1) return;
    state->current_player = (state->current_player + 1) % NUM_PLAYERS;
    state->dice_rolled = 0;
    state->last_dice = 0;
}

/**
 * Check if any player has achieved victory.
 */
int check_winner(const struct GameState *state) {
    if (!state) return -1;
    for (int p = 0; p < NUM_PLAYERS; p++) {
        if (state->players[p].home_count >= TOKENS_PER_PLAYER) {
            return p;
        }
    }
    return -1;
}

/* --- JSON Export & Import (Used by Node.js web server bridge) --- */

void export_state_json(const struct GameState *state, char *output, size_t max_len) {
    if (!state || !output || max_len == 0) return;

    char buffer[2048];
    int offset = 0;

    offset += snprintf(buffer + offset, sizeof(buffer) - offset,
        "{\"currentPlayer\":%d,\"lastDice\":%d,\"diceRolled\":%d,\"extraTurn\":%d,\"winner\":%d,\"statusMsg\":\"%s\",\"players\":[",
        state->current_player, state->last_dice, state->dice_rolled,
        state->extra_turn, state->winner, state->status_msg);

    for (int p = 0; p < NUM_PLAYERS; p++) {
        offset += snprintf(buffer + offset, sizeof(buffer) - offset,
            "{\"id\":%d,\"name\":\"%s\",\"homeCount\":%d,\"tokens\":[%d,%d,%d,%d]}%s",
            state->players[p].id,
            state->players[p].name,
            state->players[p].home_count,
            state->players[p].tokens[0],
            state->players[p].tokens[1],
            state->players[p].tokens[2],
            state->players[p].tokens[3],
            (p < NUM_PLAYERS - 1) ? "," : "");
    }

    offset += snprintf(buffer + offset, sizeof(buffer) - offset, "]}");
    strncpy(output, buffer, max_len - 1);
    output[max_len - 1] = '\0';
}

/**
 * Simple lightweight parser for state JSON from Node.js
 */
int import_state_json(struct GameState *state, const char *json) {
    if (!state || !json) return 0;

    init_game(state);

    /* Parse basic top-level integers */
    const char *ptr;
    if ((ptr = strstr(json, "\"currentPlayer\":"))) sscanf(ptr, "\"currentPlayer\":%d", &state->current_player);
    if ((ptr = strstr(json, "\"lastDice\":"))) sscanf(ptr, "\"lastDice\":%d", &state->last_dice);
    if ((ptr = strstr(json, "\"diceRolled\":"))) sscanf(ptr, "\"diceRolled\":%d", &state->dice_rolled);
    if ((ptr = strstr(json, "\"extraTurn\":"))) sscanf(ptr, "\"extraTurn\":%d", &state->extra_turn);
    if ((ptr = strstr(json, "\"winner\":"))) sscanf(ptr, "\"winner\":%d", &state->winner);

    /* Parse tokens for each player */
    const char *players_str = strstr(json, "\"players\":");
    if (players_str) {
        for (int p = 0; p < NUM_PLAYERS; p++) {
            const char *tok_str = strstr(players_str, "\"tokens\":[");
            if (tok_str) {
                int t0, t1, t2, t3;
                if (sscanf(tok_str, "\"tokens\":[%d,%d,%d,%d]", &t0, &t1, &t2, &t3) == 4) {
                    state->players[p].tokens[0] = t0;
                    state->players[p].tokens[1] = t1;
                    state->players[p].tokens[2] = t2;
                    state->players[p].tokens[3] = t3;

                    int hc = 0;
                    if (t0 == STEP_HOME) hc++;
                    if (t1 == STEP_HOME) hc++;
                    if (t2 == STEP_HOME) hc++;
                    if (t3 == STEP_HOME) hc++;
                    state->players[p].home_count = hc;
                }
                players_str = tok_str + 10;
            }
        }
    }

    return 1;
}

/* --- Interactive Terminal Mode (For Viva / CLI Demonstration) --- */

static void print_terminal_board(const struct GameState *state) {
    printf("\n=================================================================\n");
    printf("                  🎲 LUDO GAME (C ENGINE) 🎲                    \n");
    printf("=================================================================\n");
    printf(" Status: %s\n", state->status_msg);
    printf(" Turn  : %s (Player %d) | Last Dice: %d | Extra Turn: %s\n",
           state->players[state->current_player].name,
           state->current_player,
           state->last_dice,
           state->extra_turn ? "YES" : "NO");
    printf("-----------------------------------------------------------------\n");

    for (int p = 0; p < NUM_PLAYERS; p++) {
        printf(" [%-6s] Finished: %d/4 | Tokens: [", state->players[p].name, state->players[p].home_count);
        for (int t = 0; t < TOKENS_PER_PLAYER; t++) {
            int step = state->players[p].tokens[t];
            if (step == STEP_BASE) {
                printf(" #%d:BASE ", t + 1);
            } else if (step == STEP_HOME) {
                printf(" #%d:HOME! ", t + 1);
            } else if (step > 50) {
                printf(" #%d:H+%d ", t + 1, step - 50);
            } else {
                int tile = get_common_tile(p, step);
                printf(" #%d:T%d%s ", t + 1, tile, is_safe_tile(tile) ? "*" : "");
            }
        }
        printf("]\n");
    }
    printf("=================================================================\n");
}

/* --- Main Entrypoint --- */

int main(int argc, char *argv[]) {
    srand((unsigned int)time(NULL));

    /*
     * Mode 1: JSON Engine Mode (Called by Node.js Backend Server)
     * Usage:
     *   ./ludo_engine init
     *   ./ludo_engine roll '<state_json>'
     *   ./ludo_engine move '<state_json>' <player_id> <token_id>
     */
    if (argc >= 2) {
        struct GameState state;

        if (strcmp(argv[1], "init") == 0) {
            init_game(&state);
            char json_out[2048];
            export_state_json(&state, json_out, sizeof(json_out));
            printf("%s\n", json_out);
            return 0;
        }

        if (strcmp(argv[1], "roll") == 0 && argc >= 3) {
            import_state_json(&state, argv[2]);
            if (state.winner != -1) {
                char json_out[2048];
                export_state_json(&state, json_out, sizeof(json_out));
                printf("%s\n", json_out);
                return 0;
            }

            int dice = roll_dice();
            state.last_dice = dice;
            state.dice_rolled = 1;

            if (!has_any_valid_move(&state, state.current_player, dice)) {
                snprintf(state.status_msg, sizeof(state.status_msg),
                         "%s rolled %d, but has no valid moves. Passing turn.",
                         state.players[state.current_player].name, dice);
                state.dice_rolled = 0;
                next_turn(&state);
            } else {
                snprintf(state.status_msg, sizeof(state.status_msg),
                         "%s rolled %d! Select a token to move.",
                         state.players[state.current_player].name, dice);
            }

            char json_out[2048];
            export_state_json(&state, json_out, sizeof(json_out));
            printf("%s\n", json_out);
            return 0;
        }

        if (strcmp(argv[1], "move") == 0 && argc >= 5) {
            import_state_json(&state, argv[2]);
            int player_id = atoi(argv[3]);
            int token_id = atoi(argv[4]);

            if (state.dice_rolled && player_id == state.current_player) {
                move_token(&state, player_id, token_id, state.last_dice);
            }

            char json_out[2048];
            export_state_json(&state, json_out, sizeof(json_out));
            printf("%s\n", json_out);
            return 0;
        }
    }

    /*
     * Mode 2: Interactive Terminal Mode (For Professor / Viva Demonstration)
     */
    printf("\nWelcome to Ludo in C! Starting interactive terminal demonstration...\n");
    struct GameState game;
    init_game(&game);

    while (game.winner == -1) {
        print_terminal_board(&game);
        printf("\n[%s's Turn] Press ENTER to roll dice...", game.players[game.current_player].name);
        getchar();

        int dice = roll_dice();
        game.last_dice = dice;
        game.dice_rolled = 1;
        printf("🎲 You rolled: %d\n", dice);

        if (!has_any_valid_move(&game, game.current_player, dice)) {
            printf("❌ No valid moves possible with %d. Turn passes!\n", dice);
            game.dice_rolled = 0;
            next_turn(&game);
            continue;
        }

        printf("Available tokens to move:\n");
        for (int t = 0; t < TOKENS_PER_PLAYER; t++) {
            if (can_move_token(&game, game.current_player, t, dice)) {
                int step = game.players[game.current_player].tokens[t];
                if (step == STEP_BASE) {
                    printf("  [%d] Token #%d (In Base -> Unlocks to Start square)\n", t + 1, t + 1);
                } else {
                    printf("  [%d] Token #%d (At Step %d -> Moves to Step %d)\n", t + 1, t + 1, step, step + dice);
                }
            }
        }

        int choice = 0;
        while (1) {
            printf("Enter Token number to move (1-4): ");
            if (scanf("%d", &choice) == 1 && choice >= 1 && choice <= 4) {
                if (can_move_token(&game, game.current_player, choice - 1, dice)) {
                    while (getchar() != '\n'); /* Clear input buffer */
                    break;
                }
            }
            while (getchar() != '\n'); /* Clear invalid input */
            printf("Invalid choice! Please select a valid token.\n");
        }

        move_token(&game, game.current_player, choice - 1, dice);
    }

    print_terminal_board(&game);
    printf("\n🎉 GAME OVER! Winner is Player %s! 🎉\n", game.players[game.winner].name);

    return 0;
}
