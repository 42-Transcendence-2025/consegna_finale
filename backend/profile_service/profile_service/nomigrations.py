class NoMigrations:
    """Dummy migration module loader to disable migrations.

    When Django tries to run migrations for this project, it will find
    that every app appears to have all migrations applied. This is useful
    for microservices that share database tables managed by another
    service and should not run or generate migrations of their own.
    """

    def __contains__(self, item):
        return True

    def __getitem__(self, item):
        return None


MIGRATION_MODULES = NoMigrations()
