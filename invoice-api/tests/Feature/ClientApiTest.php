<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClientApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_clients(): void
    {
        $this->getJson('/api/clients')->assertStatus(401);
        $this->postJson('/api/clients', ['name' => 'X'])->assertStatus(401);
    }

    public function test_user_can_create_a_client(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/clients', [
            'name' => 'Acme UAB',
            'email' => 'billing@acme.test',
            'notes' => 'Recurring',
        ])
            ->assertStatus(201)
            ->assertJsonPath('name', 'Acme UAB')
            ->assertJsonPath('user_id', $user->id);

        $this->assertDatabaseHas('clients', ['user_id' => $user->id, 'name' => 'Acme UAB']);
    }

    public function test_create_ignores_user_id_from_payload(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/clients', ['name' => 'Mine', 'user_id' => $other->id])
            ->assertStatus(201)
            ->assertJsonPath('user_id', $user->id);
    }

    public function test_create_validation_errors_have_laravel_422_shape(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/clients', ['email' => 'not-an-email'])
            ->assertStatus(422)
            ->assertJsonStructure(['message', 'errors' => ['name', 'email']])
            ->assertJsonPath('errors.name.0', 'The name field is required.')
            ->assertJsonPath('errors.email.0', 'The email field must be a valid email address.');
    }

    public function test_user_can_update_a_client(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->for($user)->create(['name' => 'Old']);
        Sanctum::actingAs($user);

        $this->putJson("/api/clients/{$client->id}", ['name' => 'New'])
            ->assertOk()
            ->assertJsonPath('name', 'New');

        $this->assertDatabaseHas('clients', ['id' => $client->id, 'name' => 'New']);
    }

    public function test_update_validation_error(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->for($user)->create();
        Sanctum::actingAs($user);

        $this->putJson("/api/clients/{$client->id}", ['name' => ''])
            ->assertStatus(422)
            ->assertJsonStructure(['message', 'errors' => ['name']]);
    }

    public function test_user_can_delete_a_client_without_invoices(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->for($user)->create();
        Sanctum::actingAs($user);

        $this->deleteJson("/api/clients/{$client->id}")
            ->assertOk()
            ->assertJson(['message' => 'Deleted']);

        $this->assertDatabaseMissing('clients', ['id' => $client->id]);
    }

    public function test_client_with_invoices_cannot_be_deleted(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->for($user)->create();
        Invoice::factory()->create(['user_id' => $user->id, 'client_id' => $client->id]);
        Sanctum::actingAs($user);

        $this->deleteJson("/api/clients/{$client->id}")
            ->assertStatus(400)
            ->assertJson(['message' => 'Cannot delete client with invoices']);

        $this->assertDatabaseHas('clients', ['id' => $client->id]);
    }

    public function test_index_lists_only_own_clients(): void
    {
        $user = User::factory()->create();
        Client::factory()->for($user)->create(['name' => 'Mine']);
        Client::factory()->create(['name' => 'Theirs']);
        Sanctum::actingAs($user);

        $this->getJson('/api/clients')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Mine');
    }

    public function test_index_flags_clients_with_overdue_invoice_as_uncollectible(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->for($user)->create();
        Invoice::factory()->create(['user_id' => $user->id, 'client_id' => $client->id, 'status' => 'overdue']);
        Sanctum::actingAs($user);

        $this->getJson('/api/clients')->assertOk()->assertJsonPath('0.has_uncollectible', true);
    }

    public function test_other_user_cannot_read_update_or_delete_client(): void
    {
        $owner = User::factory()->create();
        $client = Client::factory()->for($owner)->create(['name' => 'Private']);
        Sanctum::actingAs(User::factory()->create());

        $this->getJson("/api/clients/{$client->id}")->assertStatus(404);
        $this->putJson("/api/clients/{$client->id}", ['name' => 'Hacked'])->assertStatus(404);
        // Ownership is checked before validation, so an invalid payload still 404s.
        $this->putJson("/api/clients/{$client->id}", ['name' => ''])->assertStatus(404);
        $this->deleteJson("/api/clients/{$client->id}")->assertStatus(404);

        $this->assertDatabaseHas('clients', ['id' => $client->id, 'name' => 'Private']);
    }
}
