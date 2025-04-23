const fs = require('fs');
const { setTimeout } = require('timers/promises'); // for waiting

// Constants for commands and priorities
const SCE_KERNEL_AIO_CMD_READ = 0x001;
const SCE_KERNEL_AIO_CMD_WRITE = 0x002;
const SCE_KERNEL_AIO_CMD_MASK = 0xfff;
const SCE_KERNEL_AIO_CMD_MULTI = 0x1000;
const SCE_KERNEL_AIO_PRIORITY_LOW = 1;
const SCE_KERNEL_AIO_PRIORITY_MID = 2;
const SCE_KERNEL_AIO_PRIORITY_HIGH = 3;

// Simulation of the AIO request structure
class SceKernelAioRWRequest {
    constructor(fd = -1, offset = 0, nbyte = 0, buf = null) {
        this.fd = fd;
        this.offset = offset;
        this.nbyte = nbyte;
        this.buf = buf;
        this.result = null;
    }
}

// Function to simulate submitting the AIO command
async function aio_submit_cmd(cmd, reqs, num_reqs, prio, ids) {
    // Simulating async I/O operation (in a real case, this would interact with an OS-level API)
    console.log(`Submitting command: ${cmd}, with priority: ${prio}`);
    await setTimeout(100); // Simulate delay
    return ids; // Just return ids for simulation purposes
}

// Simulate aio_multi_wait
async function aio_multi_wait(ids, num_ids, sce_errors, mode, usec) {
    console.log('Waiting for requests...');
    await setTimeout(200); // Simulate waiting
    return;
}

// Simulate aio_multi_delete
async function aio_multi_delete(ids, num_ids, sce_errors) {
    console.log('Deleting request...');
    await setTimeout(50); // Simulate deletion delay
    // Randomly simulate a "double free" scenario by generating errors
    sce_errors[0] = Math.random() < 0.5 ? 0 : 0x80020003;
    return;
}

// Race condition simulation function
async function race_func(ids, sce_errs) {
    console.log('Race function executing...');
    await aio_multi_delete([ids[0]], 1, sce_errs);
}

// Main function simulating the logic
async function main() {
    const num_reqs = 3;
    const which_req = 0;
    let race_errs = [0, 0];
    
    const reqs = new Array(num_reqs).fill(null).map(() => new SceKernelAioRWRequest());
    const ids = new Array(num_reqs).fill(0);
    const sce_errs = new Array(num_reqs).fill(0);

    // Bare minimum initialization to succeed in calling aio_submit_cmd
    reqs.forEach(req => req.fd = -1);

    // Loop to simulate the 100 iterations of command submission
    for (let i = 0; i < 100; i++) {
        // Simulate aio_submit_cmd
        await aio_submit_cmd(SCE_KERNEL_AIO_CMD_WRITE | SCE_KERNEL_AIO_CMD_MULTI, reqs, num_reqs, SCE_KERNEL_AIO_PRIORITY_HIGH, ids);
        
        // Wait for all requests to complete (simulating AND mode)
        await aio_multi_wait(ids, num_reqs, sce_errs, 0x01, 0);
        
        // Simulate race condition by running the race function in a separate async task
        const race_thread = race_func(ids, race_errs);
        
        // Simulate double delete by calling aio_multi_delete again
        await aio_multi_delete([ids[which_req]], 1, race_errs);

        // Wait for the race condition function to finish
        await race_thread;

        // Check if both errors are the same or if one is ESRCH (simulating double free detection)
        if (race_errs[0] === race_errs[1]) {
            console.log('Double Free achieved!');
            return;
        }
    }

    console.log('Double Free failed');
}

main().catch((err) => console.error('Error:', err));
