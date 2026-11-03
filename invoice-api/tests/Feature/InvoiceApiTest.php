<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InvoiceApiTest extends TestCase
{
    use RefreshDatabase;

    private function payload(Client $client, array $overrides = []): array
    {
        return array_merge([
            'client_id' => $client->id,
            'invoice_date' => '2026-01-10',
            'due_date' => '2026-01-24',
            'notes' => 'Thanks',
            'items' => [
                ['description' => 'Consulting', 'unit' => 'h', 'quantity' => 2, 'price' => 12.5],
                ['description' => 'Setup', 'unit' => 'vnt.', 'quantity' => 1, 'price' => 10],
            ],
        ], $overrides);
    }

    public function test_guest_cannot_access_invoices(): void
    {
        $this->getJson('/api/invoices')->assertStatus(401);
    }

    public function test_user_can_create_an_invoice(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->for($user)->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/invoices', $this->payload($client))
            ->assertCreated()
            ->assertJsonPath('status', 'sent')
            ->assertJsonPath('series', 'INV')
            ->assertJsonPath('number', 1)
            ->assertJsonCount(2, 'items')
            ->assertJsonPath('client.id', $client->id);

        $invoice = Invoice::firstOrFail();
        $this->assertEquals(35.0, (float) $invoice->total);
        $this->assertSame($user->id, $invoice->user_id);
        $this->assertDatabaseCount('invoice_items', 2);
        $this->assertDatabaseHas('audit_logs', ['event' => 'invoice.created']);
    }

    public function test_invoice_numbers_increment_per_user_and_are_independent_between_users(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        $clientA = Client::factory()->for($a)->create();
        $clientB = Client::factory()->for($b)->create();

        Sanctum::actingAs($a);
        $this->postJson('/api/invoices', $this->payload($clientA))->assertJsonPath('number', 1);
        $this->postJson('/api/invoices', $this->payload($clientA))->assertJsonPath('number', 2);

        Sanctum::actingAs($b);
        $this->postJson('/api/invoices', $this->payload($clientB))->assertJsonPath('number', 1);

        $this->assertSame(3, $a->fresh()->next_invoice_number);
        $this->assertSame(2, $b->fresh()->next_invoice_number);
    }

    public function test_database_rejects_duplicate_series_and_number_per_user(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->for($user)->create();
        Invoice::factory()->create(['user_id' => $user->id, 'client_id' => $client->id, 'series' => 'INV', 'number' => 7]);

        // Same number for another user is fine.
        Invoice::factory()->create(['series' => 'INV', 'number' => 7]);

        $this->expectException(QueryException::class);
        Invoice::factory()->create(['user_id' => $user->id, 'client_id' => $client->id, 'series' => 'INV', 'number' => 7]);
    }

    public function test_create_validation_errors_have_422_shape(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/invoices', [])
            ->assertStatus(422)
            ->assertJsonStructure(['message', 'errors' => ['client_id', 'invoice_date', 'due_date', 'items']]);
    }

    public function test_create_rejects_due_date_before_invoice_date_and_bad_items(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->for($user)->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/invoices', $this->payload($client, [
            'due_date' => '2026-01-01',
            'items' => [['description' => 'X', 'unit' => 'h', 'quantity' => 0, 'price' => -1]],
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['due_date', 'items.0.quantity', 'items.0.price']);

        $this->assertDatabaseCount('invoices', 0);
    }

    public function test_create_rejects_another_users_client(): void
    {
        $user = User::factory()->create();
        $foreignClient = Client::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/invoices', $this->payload($foreignClient))
            ->assertStatus(422)
            ->assertJsonPath('errors.client_id.0', 'Invalid client.');

        $this->assertDatabaseCount('invoices', 0);
    }

    public function test_user_can_view_own_invoice(): void
    {
        $user = User::factory()->create();
        $invoice = Invoice::factory()->create(['user_id' => $user->id]);
        Sanctum::actingAs($user);

        $this->getJson("/api/invoices/{$invoice->id}")
            ->assertOk()
            ->assertJsonPath('id', $invoice->id)
            ->assertJsonStructure(['client', 'items']);
    }

    public function test_user_can_update_invoice_and_items_are_replaced(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->for($user)->create();
        Sanctum::actingAs($user);
        $id = $this->postJson('/api/invoices', $this->payload($client))->json('id');

        $this->putJson("/api/invoices/{$id}", $this->payload($client, [
            'notes' => 'Updated',
            'items' => [['description' => 'Only', 'unit' => 'h', 'quantity' => 3, 'price' => 10]],
        ]))
            ->assertOk()
            ->assertJsonPath('notes', 'Updated')
            ->assertJsonCount(1, 'items');

        $this->assertEquals(30.0, (float) Invoice::find($id)->total);
        $this->assertDatabaseCount('invoice_items', 1);
    }

    public function test_update_validation_error(): void
    {
        $user = User::factory()->create();
        $invoice = Invoice::factory()->create(['user_id' => $user->id]);
        Sanctum::actingAs($user);

        $this->putJson("/api/invoices/{$invoice->id}", ['items' => []])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['client_id', 'items']);
    }

    public function test_user_can_delete_invoice(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->for($user)->create();
        Sanctum::actingAs($user);
        $id = $this->postJson('/api/invoices', $this->payload($client))->json('id');

        $this->deleteJson("/api/invoices/{$id}")
            ->assertOk()
            ->assertJson(['message' => 'Invoice deleted']);

        $this->assertDatabaseMissing('invoices', ['id' => $id]);
        $this->assertDatabaseCount('invoice_items', 0);
    }

    public function test_user_can_change_status(): void
    {
        $user = User::factory()->create();
        $invoice = Invoice::factory()->create(['user_id' => $user->id, 'status' => 'sent']);
        Sanctum::actingAs($user);

        foreach (['draft', 'paid', 'overdue', 'sent'] as $status) {
            $this->postJson("/api/invoices/{$invoice->id}/status", ['status' => $status])
                ->assertOk()
                ->assertJsonPath('status', $status);
        }
    }

    public function test_status_update_rejects_invalid_or_missing_status(): void
    {
        $user = User::factory()->create();
        $invoice = Invoice::factory()->create(['user_id' => $user->id, 'status' => 'sent']);
        Sanctum::actingAs($user);

        $this->postJson("/api/invoices/{$invoice->id}/status", ['status' => 'cancelled'])
            ->assertStatus(422)
            ->assertJsonPath('errors.status.0', 'The selected status is invalid.');

        $this->postJson("/api/invoices/{$invoice->id}/status", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        $this->assertSame('sent', $invoice->fresh()->status);
    }

    public function test_bulk_status_updates_only_own_invoices(): void
    {
        $user = User::factory()->create();
        $mine = Invoice::factory()->count(2)->create(['user_id' => $user->id, 'status' => 'sent']);
        $theirs = Invoice::factory()->create(['status' => 'sent']);
        Sanctum::actingAs($user);

        $this->postJson('/api/invoices/bulk-status', [
            'ids' => [...$mine->pluck('id')->all(), $theirs->id],
            'status' => 'paid',
        ])
            ->assertOk()
            ->assertJson(['message' => '2 invoice(s) updated']);

        $this->assertSame(2, Invoice::where('status', 'paid')->count());
        $this->assertSame('sent', $theirs->fresh()->status);
    }

    public function test_bulk_status_validation(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/invoices/bulk-status', ['ids' => [], 'status' => 'bogus'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['ids', 'status']);

        $this->postJson('/api/invoices/bulk-status', ['ids' => ['abc'], 'status' => 'paid'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['ids.0']);
    }

    public function test_bulk_delete_removes_only_own_invoices(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->for($user)->create();
        Sanctum::actingAs($user);
        $mineId = $this->postJson('/api/invoices', $this->payload($client))->json('id');
        $theirs = Invoice::factory()->create();

        $this->postJson('/api/invoices/bulk-delete', ['ids' => [$mineId, $theirs->id]])
            ->assertOk()
            ->assertJson(['message' => '1 invoice(s) deleted']);

        $this->assertDatabaseMissing('invoices', ['id' => $mineId]);
        $this->assertDatabaseHas('invoices', ['id' => $theirs->id]);
        $this->assertDatabaseCount('invoice_items', 0);
    }

    public function test_bulk_delete_validation(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/invoices/bulk-delete', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['ids']);
    }

    public function test_index_lists_only_own_invoices(): void
    {
        $user = User::factory()->create();
        Invoice::factory()->count(2)->create(['user_id' => $user->id]);
        Invoice::factory()->create();
        Sanctum::actingAs($user);

        $this->getJson('/api/invoices')->assertOk()->assertJsonPath('total', 2);
    }

    public function test_other_user_cannot_access_invoice(): void
    {
        $owner = User::factory()->create();
        $client = Client::factory()->for($owner)->create();
        $invoice = Invoice::factory()->create(['user_id' => $owner->id, 'client_id' => $client->id, 'status' => 'sent']);
        $intruder = User::factory()->create();
        $intruderClient = Client::factory()->for($intruder)->create();
        Sanctum::actingAs($intruder);

        $this->getJson("/api/invoices/{$invoice->id}")->assertStatus(404);
        $this->putJson("/api/invoices/{$invoice->id}", $this->payload($intruderClient))->assertStatus(404);
        // Ownership is checked before validation: invalid payloads still 404.
        $this->putJson("/api/invoices/{$invoice->id}", [])->assertStatus(404);
        $this->deleteJson("/api/invoices/{$invoice->id}")->assertStatus(404);
        $this->postJson("/api/invoices/{$invoice->id}/status", ['status' => 'paid'])->assertStatus(404);
        $this->postJson("/api/invoices/{$invoice->id}/status", ['status' => 'bogus'])->assertStatus(404);
        $this->postJson("/api/invoices/{$invoice->id}/duplicate")->assertStatus(404);
        $this->getJson("/api/invoices/{$invoice->id}/pdf")->assertStatus(404);

        $this->assertSame('sent', $invoice->fresh()->status);
        $this->assertDatabaseHas('invoices', ['id' => $invoice->id]);
        $this->assertDatabaseCount('invoices', 1);
    }

    public function test_status_update_for_missing_invoice_is_404(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/invoices/99999/status', ['status' => 'paid'])->assertStatus(404);
    }
}
