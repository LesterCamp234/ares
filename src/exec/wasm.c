#ifdef __wasm__
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "ares/emulate.h"

#define MALLOC_ALIGN 8

extern char __heap_base;
size_t g_heap_size = 0;
extern void panic();

void *memset(void *dest, int c, size_t n) {
    uint8_t *pdest = (uint8_t *)dest;

    for (size_t i = 0; i < n; i++) {
        pdest[i] = c;
    }

    return dest;
}

void *malloc(size_t size) {
    if (size == 0) return NULL;
    size_t heap_base = (size_t)&__heap_base;
    size_t curr = heap_base + g_heap_size;
    size_t aligned = (curr + (MALLOC_ALIGN - 1)) & ~(MALLOC_ALIGN - 1);
    size_t end;
    if (__builtin_add_overflow(aligned, size, &end)) return NULL;
    size_t allocated = __builtin_wasm_memory_size(0) << 16;
    if (end > allocated) {
        size_t delta = end - allocated;
        size_t delta_pages = (delta + 65535) >> 16;
        if (__builtin_wasm_memory_grow(0, delta_pages) == -1) return NULL;
    }
    g_heap_size = end - heap_base;
    return (void *)aligned;
}

void *calloc(size_t n, size_t size) {
    size_t total;
    if (__builtin_mul_overflow(n, size, &total)) return NULL;
    void *ptr = malloc(total);
    if (ptr) __builtin_memset(ptr, 0, total);
    return ptr;
}

void free(void *ptr) {
    // lol
}

size_t strlen(const char *str) {
    const char *s;
    for (s = str; *s; ++s);
    return s - str;
}

int memcmp(const void *s1, const void *s2, size_t n) {
    const uint8_t *p1 = (const uint8_t *)s1;
    const uint8_t *p2 = (const uint8_t *)s2;
    for (size_t i = 0; i < n; i++) {
        if (p1[i] != p2[i]) {
            return p1[i] < p2[i] ? -1 : 1;
        }
    }
    return 0;
}

void *memcpy(void *dest, const void *src, size_t n) {
    uint8_t *pdest = (uint8_t *)dest;
    const uint8_t *psrc = (const uint8_t *)src;

    for (size_t i = 0; i < n; i++) {
        pdest[i] = psrc[i];
    }

    return dest;
}

#include "ares/emulate.h"

AresState g_state = {0};

export u32 g_get_addr_from_line_start;
export u32 g_get_addr_from_line_end;
export char g_emu_disassemble_buf[64];

uint32_t get_pc(AresState *g) { return g->pc; }

uint32_t get_reg(AresState *g, uint32_t idx) {
    if (idx < 32) return g->regs[idx];
    return 0;
}

void set_reg(AresState *g, uint32_t idx, uint32_t value) {
    if (idx < 32) g->regs[idx] = value;
}

uint32_t get_csr(AresState *g, uint32_t idx) {
    if (idx < 4096) return g->csr[idx];
    return 0;
}

void set_csr(AresState *g, uint32_t idx, uint32_t value) {
    if (idx < 4096) g->csr[idx] = value;
}

uint32_t get_privilege_level(AresState *g) { return g->privilege_level; }

uint32_t get_exited(AresState *g) { return g->exited ? 1 : 0; }

uint32_t get_exit_code(AresState *g) { return g->exit_code; }

uint32_t get_error_line(AresState *g) { return g->error_line; }

uint32_t get_error(AresState *g) { return (uint32_t)(uintptr_t)g->error; }

uint32_t get_runtime_error_type(AresState *g) { return g->runtime_error_type; }

uint32_t get_runtime_error_params(AresState *g, uint32_t idx) {
    if (idx < 2) return g->runtime_error_params[idx];
    return 0;
}

uint32_t get_mem_written_addr(AresState *g) { return g->mem_written_addr; }

uint32_t get_mem_written_len(AresState *g) { return g->mem_written_len; }

uint32_t get_reg_written(AresState *g) { return g->reg_written; }

uint32_t get_got_breakpoint(AresState *g) { return g->got_breakpoint ? 1 : 0; }

uint32_t get_shadow_stack_len(AresState *g) { return g->shadow_stack.len; }

uint32_t get_callsan_written_by(AresState *g, uint32_t offset) {
    if (offset < STACK_LEN / 4) {
        return g->callsan_stack_written_by[offset];
    }
    return 0;
}

void get_addr_from_line(AresState *g, u32 line) {
    get_addr_from_line_r(g, line, &g_get_addr_from_line_start,
                         &g_get_addr_from_line_end);
}

size_t emu_disassemble_addr(AresState *g, u32 addr) {
    bool err = false;
    u32 inst = LOAD(g, addr, 2, &err);
    if (err) {
        g_emu_disassemble_buf[0] = '\0';
        return 0;
    }

    if ((inst & 0b11) == 0b11) {
        inst = LOAD(g, addr, 4, &err);
        if (err) {
            g_emu_disassemble_buf[0] = '\0';
            return 0;
        }
    }

    return disassemble(inst, g_emu_disassemble_buf, 64);
}

u32 get_shadow_stack_pc(AresState *g, size_t ent) {
    if (ent >= g->shadow_stack.len) return 0;
    return g->shadow_stack.buf[ent].pc;
}
u32 get_shadow_stack_sp(AresState *g, size_t ent) {
    if (ent >= g->shadow_stack.len) return 0;
    return g->shadow_stack.buf[ent].sp;
}
u32 get_shadow_stack_args(AresState *g, size_t ent, size_t i) {
    if (ent >= g->shadow_stack.len) return 0;
    return g->shadow_stack.buf[ent].args[i];
}
u32 get_shadow_stack_sregs(AresState *g, size_t ent, size_t i) {
    if (ent >= g->shadow_stack.len) return 0;
    return g->shadow_stack.buf[ent].sregs[i];
}
u32 get_shadow_stack_ra(AresState *g, size_t ent) {
    if (ent >= g->shadow_stack.len) return 0;
    return g->shadow_stack.buf[ent].ra;
}
u32 get_shadow_stack_reg_bitmap(AresState *g, size_t ent) {
    if (ent >= g->shadow_stack.len) return 0;
    return g->shadow_stack.buf[ent].reg_bitmap;
}

const char *g_pc_to_label_txt;
size_t g_pc_to_label_len;
u32 g_pc_to_label_off;
void pc_to_label(AresState *g, u32 pc) {
    LabelData *l;
    if (pc_to_label_r(g, pc, &l, &g_pc_to_label_off)) {
        g_pc_to_label_txt = l->txt;
        g_pc_to_label_len = l->len;
        return;
    }
    g_pc_to_label_txt = NULL;
    g_pc_to_label_len = 0;
}

#endif