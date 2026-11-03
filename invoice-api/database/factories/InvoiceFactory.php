<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    protected $model = Invoice::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            // Client owned by the same user as the invoice.
            'client_id' => fn (array $attributes) => Client::factory()->create(['user_id' => $attributes['user_id']])->id,
            'series' => 'INV',
            'number' => fake()->unique()->numberBetween(1, 1000000),
            'invoice_date' => now()->toDateString(),
            'due_date' => now()->addDays(14)->toDateString(),
            'total' => 0,
            'status' => 'sent',
        ];
    }
}
