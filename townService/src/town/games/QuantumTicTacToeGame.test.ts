import { throws } from 'node:assert';
import exp from 'node:constants';
import { createPlayerForTesting } from '../../TestUtils';
import Player from '../../lib/Player';
import { GameMove } from '../../types/CoveyTownSocket';
import QuantumTicTacToeGame from './QuantumTicTacToeGame';
import {
  GAME_FULL_MESSAGE,
  PLAYER_ALREADY_IN_GAME_MESSAGE,
} from '../../lib/InvalidParametersError';

describe('QuantumTicTacToeGame', () => {
  let game: QuantumTicTacToeGame;
  let player1: Player;
  let player2: Player;
  let dummyPlayer: Player;

  beforeEach(() => {
    game = new QuantumTicTacToeGame();
    player1 = createPlayerForTesting();
    player2 = createPlayerForTesting();
    dummyPlayer = createPlayerForTesting();
  });

  describe('_join', () => {
    it('should add the first player as X', () => {
      game.join(player1);
      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBeUndefined();
      expect(game.state.status).toBe('WAITING_TO_START');
    });
    it('should add the second player as O', () => {
      game.join(player1);
      game.join(player2);
      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBe(player2.id);
      expect(game.state.status).toBe('IN_PROGRESS');
    });
    it('should throw error if game is full', () => {
      game.join(player1);
      game.join(player2);
      expect(() => game.join(dummyPlayer)).toThrowError(GAME_FULL_MESSAGE);
    });
    it('should throw error is player 1 already in game', () => {
      game.join(player1);
      expect(() => game.join(player1)).toThrowError(PLAYER_ALREADY_IN_GAME_MESSAGE);
    });
    it('should throw error is player 2 already in game', () => {
      game.join(player2);
      expect(() => game.join(player2)).toThrowError(PLAYER_ALREADY_IN_GAME_MESSAGE);
    });

    describe('When the player can be added', () => {
      it('makes the first player X and inits the state', () => {
        const player = createPlayerForTesting();
        game.join(player);
        expect(game.state.x).toBe(player.id);
        expect(game.state.o).toBeUndefined();
        expect(game.state.moves).toHaveLength(0);
        expect(game.state.status).toBe('WAITING_TO_START');
        expect(game.state.winner).toBeUndefined();
      });
      describe('When the second player joins', () => {
        beforeEach(() => {
          game.join(player1);
          game.join(player2);
        });
        it('makes the second player O', () => {
          expect(game.state.x).toBe(player1.id);
          expect(game.state.o).toBe(player2.id);
        });
        it('sets the game status to IN_PROGRESS', () => {
          expect(game.state.status).toBe('IN_PROGRESS');
          expect(game.state.winner).toBeUndefined();
          expect(game.state.moves).toHaveLength(0);
        });
      });
    });
  });

  describe('_leave', () => {
    describe('when two players are in the game', () => {
      beforeEach(() => {
        game.join(player1);
        game.join(player2);
        expect(game.state.x).toBe(player1.id);
        expect(game.state.o).toBe(player2.id);
      });

      it('should set the game to OVER and declare O the winner', () => {
        game.leave(player1);

        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(player2.id);
        expect(game.state.moves).toHaveLength(0);

        expect(game.state.x).toBe(player1.id);
        expect(game.state.o).toBe(player2.id);
      });

      it('should set the game to OVER and declare X the winner', () => {
        game.leave(player2);

        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(player1.id);
        expect(game.state.moves).toHaveLength(0);

        expect(game.state.x).toBe(player1.id);
        expect(game.state.o).toBe(player2.id);
      });
    });
    describe('when one player is in the game', () => {
      beforeEach(() => {
        game.join(player1);
        expect(game.state.x).toBe(player1.id);
        expect(game.state.o).toBeUndefined();
        expect(game.state.moves).toHaveLength(0);
        expect(game.state.winner).toBeUndefined();
        expect(game.state.status).toBe('WAITING_TO_START');
      });

      it('should set the game to WAITING_TO_START', () => {
        expect(game.state.x).toBe(player1.id);
        expect(game.state.o).toBeUndefined();
        game.leave(player1);
        expect(game.state.status).toBe('WAITING_TO_START');
        expect(game.state.winner).toBeUndefined();
        expect(game.state.moves).toHaveLength(0);
      });
    });
  });

  describe('applyMove', () => {
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    const makeMove = (player: Player, board: 'A' | 'B' | 'C', row: 0 | 1 | 2, col: 0 | 1 | 2) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const move: GameMove<any> = {
        playerID: player.id,
        gameID: game.id,
        move: { board, row, col },
      };
      game.applyMove(move);
    };

    it('should place a piece on an empty square', () => {
      makeMove(player1, 'A', 0, 0);
      // @ts-expect-error - private property
      expect(game._games.A._board[0][0]).toBe('X');
      expect(game.state.moves.length).toBe(1);
    });

    describe('scoring and game end', () => {
      it('should award a point when a player gets three-in-a-row', () => {
        // X gets a win on board A
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'A', 0, 1); // X
        makeMove(player2, 'B', 0, 1); // O
        makeMove(player1, 'A', 0, 2); // X -> scores 1 point

        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(0);
      });
    });
  });
});
