/**
 * ============================================================================
 * Project: Ludo Game Core Engine
 * Language: C (C99 Standard)
 * Description: Header file defining Ludo data structures, constants,
 *              and core function prototypes for 1st Year CSE Project.
 * ============================================================================
 */

#ifndef LUDO_H
#define LUDO_H

#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <string.h>
#include <time.h>

/* --- Board & Game Constants --- */
#define NUM_PLAYERS 4
#define TOKENS_PER_PLAYER 4
#define COMMON_TRACK_LENGTH 52
#define HOME_PATH_STEPS 5
#define STEP_BASE -1        /* Token is inside base / yard */
#define STEP_START 0        /* Token has entered start tile */
#define STEP_HOME 56        /* 0 to 50 = common, 51 to 55 = home stretch, 56 = Home Goal */

/* Player Color IDs */
#define PLAYER_RED    0
#define PLAYER_GREEN  1
#define PLAYER_YELLOW 2
#define PLAYER_BLUE   3

/* Safe spots count (4 Start spots + 4 Star spots on common track) */
#define NUM_SAFE_SPOTS 8

/* --- Data Structures --- */

/**
 * Structure representing a single player
 */
struct Player {
    int id;                                 /* 0: Red, 1: Green, 2: Yellow, 3: Blue */
    char name[16];                          /* Player name / label */
    int tokens[TOKENS_PER_PLAYER];          /* Position step (-1 = base, 0 = start, 56 = home) */
    int home_count;                         /* Number of tokens that have finished (0 to 4) */
    int is_active;                          /* 1 = Playing, 0 = Inactive */
};

/**
 * Structure representing the entire game state
 */
struct GameState {
    struct Player players[NUM_PLAYERS];     /* All 4 players */
    int current_player;                     /* Whose turn it is (0 to 3) */
    int last_dice;                          /* Last rolled dice value (1 to 6, or 0 if not rolled) */
    int dice_rolled;                        /* 1 if dice has been rolled and move is pending, else 0 */
    int extra_turn;                         /* 1 if player rolled 6 and gets another turn */
    int winner;                             /* -1 if game is ongoing, 0 to 3 if a player has won */
    char status_msg[128];                   /* Human-readable message describing the last action */
};

/* --- Core Function Prototypes --- */

/* 1. Initialization */
void init_game(struct GameState *state);

/* 2. Dice Logic */
int roll_dice(void);

/* 3. Coordinate & Tile Conversions */
int get_start_tile(int player_id);
int get_common_tile(int player_id, int step);
int is_safe_tile(int tile_index);

/* 4. Move Validation & Execution */
int can_move_token(const struct GameState *state, int player_id, int token_id, int dice);
int has_any_valid_move(const struct GameState *state, int player_id, int dice);
int move_token(struct GameState *state, int player_id, int token_id, int dice);

/* 5. Turn & Game Lifecycle */
void next_turn(struct GameState *state);
int check_winner(const struct GameState *state);

/* 6. Serialization / JSON Helpers (Used by Node.js web server) */
void export_state_json(const struct GameState *state, char *output, size_t max_len);
int import_state_json(struct GameState *state, const char *json);

#endif /* LUDO_H */
