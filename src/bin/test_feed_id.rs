use pyth_solana_receiver_sdk::price_update::get_feed_id_from_hex;

fn main() {
    let feed_id_hex = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
    let feed_id_bytes = get_feed_id_from_hex(&feed_id_hex).unwrap();

    println!("Feed ID hex: {}", feed_id_hex);
    println!("Feed ID bytes: {:?}", feed_id_bytes);
    println!("First 8 bytes: {:?}", &feed_id_bytes[..8]);

    // Print as hex manually
    let first_8 = &feed_id_bytes[..8];
    print!("First 8 bytes as hex: ");
    for byte in first_8 {
        print!("{:02x}", byte);
    }
    println!();
}
