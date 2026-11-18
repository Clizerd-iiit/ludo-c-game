# Makefile for Ludo Core Engine (C Language)
# CC: Compiler to use (gcc or clang)
CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c99

all: ludo_engine

ludo_engine: c_src/ludo.c c_src/ludo.h
	$(CC) $(CFLAGS) c_src/ludo.c -o ludo_engine

clean:
	rm -f ludo_engine

test: ludo_engine
	@echo "Testing Engine Init..."
	./ludo_engine init
	@echo "Engine Test Passed!"
