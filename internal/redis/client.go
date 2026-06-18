package redis

import (
	"context"
	"fmt"

	"nexus/internal/config"

	goredis "github.com/redis/go-redis/v9"
)

var (
	Client *goredis.Client
	Ctx    = context.Background()
)

func Connect() error {
	Client = goredis.NewClient(&goredis.Options{
		Addr:     fmt.Sprintf("%s:%s", config.Env.RedisHost, config.Env.RedisPort),
		Password: config.Env.RedisPassword,
		DB:       0,
	})

	if err := Client.Ping(Ctx).Err(); err != nil {
		return err
	}

	return nil
}

func Close() error {
	if Client != nil {
		return Client.Close()
	}
	return nil
}