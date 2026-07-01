"""Seed the bundled preset agents (workspace models) at startup.

Agents are declared in open_webui.preset_agents_data. Seeding is
insert-only and idempotent: an id that already exists in the model
table is never touched, so admin edits survive restarts and deleting
an agent only brings it back on the next boot.

The agents' base model is resolved from the HERMES_BASE_MODEL
environment variable at seed time (default: hermes3:latest, the
NousResearch Hermes 3 tag served by Ollama).
"""

import logging
import os

from open_webui.models.config import Config
from open_webui.models.models import ModelForm, ModelMeta, ModelParams, Models
from open_webui.models.users import Users
from open_webui.preset_agents_data import DEFAULT_AGENT_ID, PRESET_AGENTS

log = logging.getLogger(__name__)

HERMES_BASE_MODEL = os.environ.get('HERMES_BASE_MODEL', 'hermes3:latest')


async def seed_preset_agents() -> None:
    """Insert missing preset agents; never update or delete existing rows."""
    try:
        owner = await Users.get_super_admin_user()
        # model.user_id has no FK; list/search endpoints tolerate a dangling
        # owner id, and admins can manage the entry either way.
        owner_id = owner.id if owner else 'system'

        seeded_any = False
        for agent in PRESET_AGENTS:
            if await Models.get_model_by_id(agent['id']):
                continue

            form = ModelForm(
                id=agent['id'],
                base_model_id=HERMES_BASE_MODEL,
                name=agent['name'],
                meta=ModelMeta(
                    profile_image_url=agent.get('profile_image_url'),
                    description=agent.get('description'),
                ),
                params=ModelParams(system=agent['system']),
                access_grants=[{'principal_type': 'user', 'principal_id': '*', 'permission': 'read'}],
                is_active=True,
            )
            if await Models.insert_new_model(form, owner_id):
                seeded_any = True
                log.info("Seeded preset agent '%s' (base model: %s)", agent['id'], HERMES_BASE_MODEL)
            else:
                log.error("Failed to seed preset agent '%s'", agent['id'])

        if seeded_any and DEFAULT_AGENT_ID and not await Config.get('ui.default_models'):
            await Config.upsert({'ui.default_models': DEFAULT_AGENT_ID})
    except Exception:
        log.exception('Preset agent seeding failed')
