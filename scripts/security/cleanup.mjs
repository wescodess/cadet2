export async function cleanupBoundaryRun({ stop, recover, removeWorkspace, removeHandlers }) {
  try {
    await stop()
  } finally {
    try {
      await recover()
    } finally {
      try {
        await removeWorkspace()
      } finally {
        removeHandlers()
      }
    }
  }
}
